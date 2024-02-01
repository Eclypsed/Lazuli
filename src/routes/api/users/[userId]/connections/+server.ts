import { Connections } from '$lib/server/users'
import { isValidURL } from '$lib/utils'
import type { RequestHandler } from '@sveltejs/kit'
import { z } from 'zod'

export const GET: RequestHandler = async ({ params }) => {
    const userId = params.userId as string

    const connections = Connections.getUserConnections(userId)
    return new Response(JSON.stringify(connections))
}

const connectionSchema = z.object({
    serviceType: z.enum(['jellyfin', 'youtube-music']),
    serviceUserId: z.string(),
    urlOrigin: z.string().refine((val) => isValidURL(val)),
    accessToken: z.string(),
})
export type NewConnection = z.infer<typeof connectionSchema>

export const POST: RequestHandler = async ({ params, request }) => {
    const userId = params.userId as string

    const connection = await request.json()

    const connectionValidation = connectionSchema.safeParse(connection)
    if (!connectionValidation.success) return new Response(connectionValidation.error.message, { status: 400 })

    const { serviceType, serviceUserId, urlOrigin, accessToken } = connectionValidation.data
    const service: Service = {
        type: serviceType,
        userId: serviceUserId,
        urlOrigin: new URL(urlOrigin).origin,
    }
    const newConnection = Connections.addConnection(userId, service, accessToken)
    return new Response(JSON.stringify(newConnection))
}

export const DELETE: RequestHandler = async ({ request }) => {
    const connectionId: string = await request.json()
    try {
        Connections.deleteConnection(connectionId)
        return new Response('Connection Deleted')
    } catch {
        return new Response('Connection does not exist', { status: 400 })
    }
}
