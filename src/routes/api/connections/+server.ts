import type { RequestHandler } from '@sveltejs/kit'
import { Connections, type ConnectionInfo } from '$lib/server/connections'

export const GET: RequestHandler = async ({ url }) => {
    const ids = url.searchParams.get('ids')?.replace(/\s/g, '').split(',')
    if (!ids) return new Response('Missing ids query parameter', { status: 400 })

    const connections: ConnectionInfo[] = []
    for (const connection of Connections.getConnections(ids)) {
        await connection
            .getConnectionInfo()
            .then((info) => connections.push(info))
            .catch((reason) => console.log(`Failed to fetch connection info: ${reason}`))
    }

    return Response.json({ connections })
}
