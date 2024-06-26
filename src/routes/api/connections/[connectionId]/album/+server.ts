import type { RequestHandler } from '@sveltejs/kit'
import { buildConnection } from '$lib/server/api-helper'

export const GET: RequestHandler = async ({ params, url }) => {
    const connectionId = params.connectionId!
    const connection = await buildConnection(connectionId).catch(() => null)
    if (!connection) return new Response('Invalid connection id', { status: 400 })

    const albumId = url.searchParams.get('id')
    if (!albumId) return new Response(`Missing id search parameter`, { status: 400 })

    const album = await connection.getAlbum(albumId).catch(() => undefined)
    if (!album) return new Response(`Failed to fetch album with id: ${albumId}`, { status: 400 })

    return Response.json({ album })
}
