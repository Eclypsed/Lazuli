import type { RequestHandler } from '@sveltejs/kit'
import { buildUserConnections } from '$lib/server/api-helper'

export const GET: RequestHandler = async ({ params }) => {
    const userConnections = await buildUserConnections(params.userId!).catch(() => null)
    if (!userConnections) return new Response('Invalid user id', { status: 400 })

    const getConnectionInfo = (connection: Connection) =>
        connection.getConnectionInfo().catch((reason) => {
            console.log(`Failed to fetch connection info: ${reason}`)
            return null
        })

    const connections = (await Promise.all(userConnections.map(getConnectionInfo))).filter((info): info is ConnectionInfo => info !== null)

    return Response.json({ connections })
}
