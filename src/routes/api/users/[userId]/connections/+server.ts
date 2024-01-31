import { Services, Connections } from '$lib/server/users'
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
    url: z.string().refine((val) => isValidURL(val)),
    accessToken: z.string(),
    refreshToken: z.string().nullable().optional(),
    expiry: z.number().nullable().optional(),
})
export type NewConnection = z.infer<typeof connectionSchema>

export const POST: RequestHandler = async ({ params, request }) => {
    const userId = params.userId as string

    const connection = await request.json()

    const connectionValidation = connectionSchema.safeParse(connection)
    if (!connectionValidation.success) return new Response(connectionValidation.error.message, { status: 400 })

    const { serviceType, serviceUserId, url, accessToken, refreshToken, expiry } = connectionValidation.data
    const newService = Services.addService(serviceType as ServiceType, serviceUserId, new URL(url))
    const newConnection = Connections.addConnection(userId, newService.id, accessToken, refreshToken as string | null, expiry as number | null)
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
