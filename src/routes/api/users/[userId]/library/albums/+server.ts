import type { RequestHandler } from '@sveltejs/kit'
import { buildUserConnections } from '$lib/server/api-helper'

export const GET: RequestHandler = async ({ params }) => {
    const userConnections = await buildUserConnections(params.userId!).catch(() => null)
    if (!userConnections) return new Response('Invalid user id', { status: 400 })

    const items = (await Promise.all(userConnections.map((connection) => connection.library.albums()))).flat()

    return Response.json({ items })
}
