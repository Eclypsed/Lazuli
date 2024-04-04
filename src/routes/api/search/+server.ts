import type { RequestHandler } from '@sveltejs/kit'
import { Connections } from '$lib/server/connections'

export const GET: RequestHandler = async ({ url }) => {
    const query = url.searchParams.get('query')
    if (!query) return new Response('Missing query parameter', { status: 400 })
    const userId = url.searchParams.get('userId')
    if (!userId) return new Response('Missing userId parameter', { status: 400 })

    const searchResults: (Song | Album | Artist | Playlist)[] = []
    for (const connection of Connections.getUserConnections(userId)) {
        await connection
            .search(query)
            .then((results) => searchResults.push(...results))
            .catch((reason) => console.error(`Failed to search "${query}" from connection ${connection.id}: ${reason}`))
    }

    return Response.json({ searchResults })
}
