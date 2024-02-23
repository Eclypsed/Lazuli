import { Connections } from '$lib/server/users'
import { Jellyfin, YouTubeMusic } from '$lib/services'
import type { RequestHandler } from '@sveltejs/kit'

export const GET: RequestHandler = async ({ params }) => {
    const userId = params.userId!

    const connections = Connections.getUserConnections(userId)
    for (const connection of connections) {
        switch (connection.type) {
            case 'jellyfin':
                connection.service = await Jellyfin.fetchSerivceInfo(connection.service.userId, connection.service.urlOrigin, connection.tokens.accessToken)
                break
            case 'youtube-music':
                connection.service = await YouTubeMusic.fetchServiceInfo(connection.service.userId, connection.tokens.accessToken)
                break
        }
    }

    return Response.json({ connections })
}
