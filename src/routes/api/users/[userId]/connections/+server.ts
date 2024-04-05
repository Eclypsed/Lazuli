import type { RequestHandler } from '@sveltejs/kit'
import { Connections } from '$lib/server/connections'

export const GET: RequestHandler = async ({ params }) => {
    const userId = params.userId!

    const connections: ConnectionInfo[] = []
    for (const connection of Connections.getUserConnections(userId)) {
        await connection
            .getConnectionInfo()
            .then((info) => connections.push(info))
            .catch((reason) => console.log(`Failed to fetch connection info: ${reason}`))
    }

    return Response.json({ connections })
}
