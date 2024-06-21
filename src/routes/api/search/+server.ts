import type { RequestHandler } from '@sveltejs/kit'
import { buildUserConnections } from '$lib/server/api-helper'

export const GET: RequestHandler = async ({ url }) => {
    const { query, userId, filter } = Object.fromEntries(url.searchParams) as { [k: string]: string | undefined }
    if (!(query && userId)) return new Response('Missing search parameter', { status: 400 })

    const userConnections = await buildUserConnections(userId).catch(() => null)
    if (!userConnections) return new Response('Invalid user id', { status: 400 })

    let checkedFilter: 'song' | 'album' | 'artist' | 'playlist' | undefined
    if (filter === 'song' || filter === 'album' || filter === 'artist' || filter === 'playlist') checkedFilter = filter

    const search = (connection: Connection) =>
        connection.search(query, checkedFilter).catch((reason) => {
            console.error(`Failed to search "${query}" from connection ${connection.id}: ${reason}`)
            return null
        })

    const searchResults = (await Promise.all(userConnections.map(search))).flat().filter((result): result is Song | Album | Artist | Playlist => result !== null)

    return Response.json({ searchResults })
}
