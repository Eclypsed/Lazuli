import type { RequestHandler } from '@sveltejs/kit'
import { Connections } from '$lib/server/connections'

export const GET: RequestHandler = async ({ params, url }) => {
    const connectionId = params.connectionId!
    const connection = Connections.getConnection(connectionId)
    if (!connection) return new Response('Invalid connection id', { status: 400 })

    const playlistId = url.searchParams.get('id')
    if (!playlistId) return new Response(`Missing id search parameter`, { status: 400 })

    const response = await connection
        .getPlaylistItems(playlistId)
        .then((playlist) => Response.json({ playlist }))
        .catch((error: TypeError | Error) => {
            if (error instanceof TypeError) return new Response('Bad Request', { status: 400 })
            return new Response('Failed to fetch playlist items', { status: 502 })
        })

    return response
}
