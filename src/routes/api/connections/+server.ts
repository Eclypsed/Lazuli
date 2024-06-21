import type { RequestHandler } from '@sveltejs/kit'
import { buildConnection } from '$lib/server/api-helper'

export const GET: RequestHandler = async ({ url }) => {
    const ids = url.searchParams.get('id')?.replace(/\s/g, '').split(',')
    if (!ids) return new Response('Missing id query parameter', { status: 400 })

    const connections = (await Promise.all(ids.map((id) => buildConnection(id).catch(() => null)))).filter((result): result is Connection => result !== null)

    const getConnectionInfo = (connection: Connection) =>
        connection.getConnectionInfo().catch((reason) => {
            console.error(`Failed to fetch connection info: ${reason}`)
            return null
        })

    const connectionInfo = (await Promise.all(connections.map(getConnectionInfo))).filter((connectionInfo): connectionInfo is ConnectionInfo => connectionInfo !== null)

    return Response.json({ connections: connectionInfo })
}
