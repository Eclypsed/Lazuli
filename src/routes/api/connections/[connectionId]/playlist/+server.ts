import type { RequestHandler } from '@sveltejs/kit'
import { Connections } from '$lib/server/connections'

export const GET: RequestHandler = async ({ params, url }) => {
    const connectionId = params.connectionId!
    const connection = Connections.getConnection(connectionId)
    if (!connection) return new Response('Invalid connection id', { status: 400 })

    const playlistId = url.searchParams.get('id')
    if (!playlistId) return new Response(`Missing id search parameter`, { status: 400 })

    const playlist = await connection.getPlaylist(playlistId).catch(() => undefined)
    if (!playlist) return new Response(`Failed to fetch playlist with id: ${playlistId}`, { status: 400 })

    return Response.json({ playlist })
}
