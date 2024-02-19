import type { RequestHandler } from '@sveltejs/kit'
import { Connections } from '$lib/server/users'

export const GET: RequestHandler = async ({ url }) => {
    const ids = url.searchParams.get('ids')?.replace(/\s/g, '').split(',')
    if (!ids) return new Response('Missing ids query parameter', { status: 400 })

    const connections: Connection[] = []
    for (const connectionId of ids) connections.push(Connections.getConnection(connectionId))

    return Response.json({ connections })
}
