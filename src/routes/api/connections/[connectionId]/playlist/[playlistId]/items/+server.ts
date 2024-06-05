import type { RequestHandler } from '@sveltejs/kit'
import { Connections } from '$lib/server/connections'

export const GET: RequestHandler = async ({ params, url }) => {
    const { connectionId, playlistId } = params
    const connection = Connections.getConnection(connectionId!)
    if (!connection) return new Response('Invalid connection id', { status: 400 })

    const startIndexString = url.searchParams.get('startIndex')
    const limitString = url.searchParams.get('limit')

    const numberStartIndex = Number(startIndexString)
    const numberLimit = Number(limitString)

    const startIndex = Number.isInteger(numberStartIndex) && numberStartIndex > 0 ? numberStartIndex : undefined
    const limit = Number.isInteger(numberLimit) && numberLimit > 0 ? numberLimit : undefined

    const response = await connection
        .getPlaylistItems(playlistId!, { startIndex, limit })
        .then((items) => Response.json({ items }))
        .catch((error: TypeError | Error) => {
            if (error instanceof TypeError) return new Response('Bad Request', { status: 400 })
            return new Response('Failed to fetch playlist items', { status: 502 })
        })

    return response
}
