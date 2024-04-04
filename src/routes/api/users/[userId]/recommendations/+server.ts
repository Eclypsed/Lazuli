import type { RequestHandler } from '@sveltejs/kit'
import { Connections } from '$lib/server/connections'

// This is temporary functionally for the sake of developing the app.
// In the future will implement more robust algorithm for offering recommendations
export const GET: RequestHandler = async ({ params }) => {
    const userId = params.userId!

    const recommendations: (Song | Album | Artist | Playlist)[] = []
    for (const connection of Connections.getUserConnections(userId)) {
        await connection
            .getRecommendations()
            .then((connectionRecommendations) => recommendations.push(...connectionRecommendations))
            .catch((reason) => console.log(`Failed to fetch recommendations: ${reason}`))
    }

    return Response.json({ recommendations })
}
