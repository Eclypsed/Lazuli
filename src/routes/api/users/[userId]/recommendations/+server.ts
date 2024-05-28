import type { RequestHandler } from '@sveltejs/kit'
import { Connections } from '$lib/server/connections'

// This is temporary functionally for the sake of developing the app.
// In the future will implement more robust algorithm for offering recommendations
export const GET: RequestHandler = async ({ params }) => {
    const userId = params.userId!

    const userConnections = Connections.getUserConnections(userId)
    if (!userConnections) return new Response('Invalid user id', { status: 400 })

    const recommendations = (
        await Promise.all(
            userConnections.map((connection) =>
                connection.getRecommendations().catch((reason) => {
                    console.log(`Failed to fetch recommendations: ${reason}`)
                    return undefined
                }),
            ),
        )
    )
        .flat()
        .filter((recommendation): recommendation is Song | Album | Artist | Playlist => recommendation?.id !== undefined)

    return Response.json({ recommendations })
}
