import type { RequestHandler } from '@sveltejs/kit'
import { Connections } from '$lib/server/connections'

export const GET: RequestHandler = async ({ params }) => {
    const { connectionId, playlistId } = params
    const connection = Connections.getConnection(connectionId!)
    if (!connection) return new Response('Invalid connection id', { status: 400 })

    const items = await connection.getPlaylistItems(playlistId!).catch((reason) => console.error(reason))
    if (!items) return new Response(`Failed to fetch playlist with id: ${playlistId!}`, { status: 400 })

    return Response.json({ items })
}
