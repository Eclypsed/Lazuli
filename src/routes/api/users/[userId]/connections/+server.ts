import { Services, type DBServiceData, Connections, type DBConnectionData } from '$lib/server/users'
import type { RequestHandler } from '@sveltejs/kit'
import { z } from 'zod'

export const GET: RequestHandler = async ({ params }) => {
    const userId = params.userId as string

    const repsonseHeaders = new Headers({
        'Content-Type': 'application/json',
    })

    const connections = Connections.getUserConnections(userId)
    return new Response(JSON.stringify(connections), { headers: repsonseHeaders })
}

export const PATCH: RequestHandler = async ({ params, request }) => {
    const userId = params.userId as string

    const serviceSchema = z.object({
        serviceType: z.enum(['jellyfin', 'youtube-music']),
        userId: z.string(),
        url: z.string(),
    })

    const connectionSchema = z.object({
        userId: z.string(),
        serviceId: z.string(),
        accessToken: z.string(),
        refreshToken: z.string().nullable(),
        expiry: z.number().nullable(),
    })

    const { service, connection } = await request.json()

    const serviceValidation = serviceSchema.safeParse(service)
    if (!serviceValidation.success) return new Response(serviceValidation.error.message, { status: 400 })
}
