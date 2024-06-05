import type { RequestHandler } from '@sveltejs/kit'
import { Connections } from '$lib/server/connections'

export const GET: RequestHandler = async ({ params }) => {
    const userId = params.userId!

    const userConnections = Connections.getUserConnections(userId)
    if (!userConnections) return new Response('Invalid user id', { status: 400 })

    const items = (await Promise.all(userConnections.map((connection) => connection.library.artists()))).flat()

    return Response.json({ items })
}
