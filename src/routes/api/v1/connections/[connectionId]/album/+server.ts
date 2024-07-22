import type { RequestHandler } from '@sveltejs/kit'
import { ConnectionFactory } from '$lib/server/api-helper'

export const GET: RequestHandler = async ({ params, url }) => {
    const connection = await ConnectionFactory.getConnection(params.connectionId!)

    const albumId = url.searchParams.get('id')
    if (!albumId) return new Response(`Missing id search parameter`, { status: 400 })

    const album = await connection.getAlbum(albumId).catch(() => undefined)
    if (!album) return new Response(`Failed to fetch album with id: ${albumId}`, { status: 400 })

    return Response.json({ album })
}
