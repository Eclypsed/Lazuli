import { Connections } from '$lib/server/users'
import { isValidURL } from '$lib/utils'
import type { RequestHandler } from '@sveltejs/kit'
import { z } from 'zod'

export const GET: RequestHandler = async ({ params }) => {
    const userId = params.userId as string

    const connections = Connections.getUserConnections(userId)
    return Response.json(connections)
}

// This schema should be identical to the Connection Data Type but without the id and userId
const newConnectionSchema = z.object({
    service: z.object({
        type: z.enum(['jellyfin', 'youtube-music']),
        userId: z.string(),
        urlOrigin: z.string().refine((val) => isValidURL(val)),
    }),
    accessToken: z.string(),
})

export const POST: RequestHandler = async ({ params, request }) => {
    const userId = params.userId as string

    const connection: Connection = await request.json()

    const connectionValidation = newConnectionSchema.safeParse(connection)
    if (!connectionValidation.success) return new Response(connectionValidation.error.message, { status: 400 })

    const { service, accessToken } = connection
    const newConnection = Connections.addConnection(userId, service, accessToken)
    return Response.json(newConnection)
}

export const DELETE: RequestHandler = async ({ request }) => {
    const requestData = await request.json()
    try {
        Connections.deleteConnection(requestData.connectionId)
        return new Response('Connection Deleted')
    } catch (error) {
        return new Response('Connection does not exist', { status: 400 })
    }
}
