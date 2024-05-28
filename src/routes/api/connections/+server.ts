import type { RequestHandler } from '@sveltejs/kit'
import { Connections } from '$lib/server/connections'

export const GET: RequestHandler = async ({ url }) => {
    const ids = url.searchParams.get('id')?.replace(/\s/g, '').split(',')
    if (!ids) return new Response('Missing id query parameter', { status: 400 })

    const connections = (
        await Promise.all(
            ids.map((id) =>
                Connections.getConnection(id)
                    ?.getConnectionInfo()
                    .catch((reason) => {
                        console.error(`Failed to fetch connection info: ${reason}`)
                        return undefined
                    }),
            ),
        )
    ).filter((connection): connection is ConnectionInfo => connection?.id !== undefined)

    return Response.json({ connections })
}
