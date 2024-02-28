import { Connections } from '$lib/server/users'
import { Jellyfin } from '$lib/services'
import { YouTubeMusic } from '$lib/service-managers/youtube-music'
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
                const youTubeMusic = new YouTubeMusic(connection)
                connection.service = await youTubeMusic.fetchServiceInfo()
                break
        }
    }

    return Response.json({ connections })
}
