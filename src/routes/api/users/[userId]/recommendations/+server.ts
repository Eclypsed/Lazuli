import type { RequestHandler } from '@sveltejs/kit'
import { buildUserConnections } from '$lib/server/api-helper'

// This is temporary functionally for the sake of developing the app.
// In the future will implement more robust algorithm for offering recommendations
export const GET: RequestHandler = async ({ params }) => {
    const userConnections = await buildUserConnections(params.userId!).catch(() => null)
    if (!userConnections) return new Response('Invalid user id', { status: 400 })

    const getRecommendations = (connection: Connection) =>
        connection.getRecommendations().catch((reason) => {
            console.log(`Failed to fetch recommendations: ${reason}`)
            return null
        })

    const recommendations = (await Promise.all(userConnections.map(getRecommendations))).flat().filter((recommendation): recommendation is Song | Album | Artist | Playlist => recommendation?.id !== undefined)

    return Response.json({ recommendations })
}
