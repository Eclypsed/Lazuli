import type { RequestHandler } from '@sveltejs/kit'
import { ConnectionFactory } from '$lib/server/api-helper'

export const GET: RequestHandler = async ({ params }) => {
    const connection = await ConnectionFactory.getConnection(params.connectionId!)

    const items = await connection.getAlbumItems(params.albumId!).catch(() => null)
    if (!items) return new Response(`Failed to fetch album with id: ${params.albumId!}`, { status: 400 })

    return Response.json({ items })
}
