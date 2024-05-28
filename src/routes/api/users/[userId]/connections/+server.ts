import type { RequestHandler } from '@sveltejs/kit'
import { Connections } from '$lib/server/connections'

export const GET: RequestHandler = async ({ params }) => {
    const userId = params.userId!

    const userConnections = Connections.getUserConnections(userId)
    if (!userConnections) return new Response('Invalid user id', { status: 400 })

    const connections = (
        await Promise.all(
            userConnections.map((connection) =>
                connection.getConnectionInfo().catch((reason) => {
                    console.log(`Failed to fetch connection info: ${reason}`)
                    return undefined
                }),
            ),
        )
    ).filter((info): info is ConnectionInfo => info !== undefined)

    return Response.json({ connections })
}
