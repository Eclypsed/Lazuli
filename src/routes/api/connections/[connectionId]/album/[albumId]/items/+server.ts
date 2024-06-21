import type { RequestHandler } from '@sveltejs/kit'
import { buildConnection } from '$lib/server/api-helper'

export const GET: RequestHandler = async ({ params }) => {
    const { connectionId, albumId } = params

    const connection = await buildConnection(connectionId!).catch(() => null)
    if (!connection) return new Response('Invalid connection id', { status: 400 })

    const items = await connection.getAlbumItems(albumId!).catch(() => null)
    if (!items) return new Response(`Failed to fetch album with id: ${albumId!}`, { status: 400 })

    return Response.json({ items })
}
