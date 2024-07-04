import type { RequestHandler } from '@sveltejs/kit'
import { ConnectionFactory } from '$lib/server/api-helper'

export const GET: RequestHandler = async ({ url }) => {
    const query = url.searchParams.get('query')
    const userId = url.searchParams.get('userId')

    const typeSet = new Set<'song' | 'album' | 'artist' | 'playlist'>()

    url.searchParams
        .get('types')
        ?.toLowerCase()
        .split(',')
        .forEach((type) => {
            type = type.trim()
            if (type === 'song' || type === 'album' || type === 'artist' || type === 'playlist') {
                typeSet.add(type)
            }
        })

    if (!(query && userId && typeSet.size > 0)) return new Response('Bad Request', { status: 400 })

    const userConnections = await ConnectionFactory.getUserConnections(userId).catch(() => null)
    if (!userConnections) return new Response('Bad Request', { status: 400 })

    const search = (connection: Connection) =>
        connection.search(query, typeSet).catch((reason) => {
            console.error(`Failed to search "${query}" from connection ${connection.id}: ${reason}`)
            return null
        })

    const results = await Promise.all(userConnections.map(search)).then((results) => results.flat().filter((result) => result !== null))

    return Response.json({ results })
}
