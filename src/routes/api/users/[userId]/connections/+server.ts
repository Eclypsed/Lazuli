import { Connections } from '$lib/server/users'
import type { RequestHandler } from '@sveltejs/kit'

export const GET: RequestHandler = async ({ params }) => {
    const userId = params.userId!

    const connections = Connections.getUserConnections(userId)
    return Response.json({ connections })
}
