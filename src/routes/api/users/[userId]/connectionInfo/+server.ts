import type { RequestHandler } from '@sveltejs/kit'
import { YouTubeMusic } from '$lib/service-managers/youtubeMusic'
import { Jellyfin } from '$lib/service-managers/jellyfin'
import { Connections } from '$lib/server/users'

export const GET: RequestHandler = async ({ params, url }) => {
    const userId = params.userId as string
    const requestedConnectionIds = url.searchParams.get('connectionIds')?.split(',')

    const connectionInfo: ConnectionInfo[] = []

    const userConnections: Connection[] = requestedConnectionIds ? Array.from(requestedConnectionIds, (id) => Connections.getConnection(id)) : Connections.getUserConnections(userId)

    for (const connection of userConnections) {
        let info: ConnectionInfo
        switch (connection.service.type) {
            case 'jellyfin':
                info = await Jellyfin.connectionInfo(connection as Jellyfin.JFConnection)
                break
            case 'youtube-music':
                info = await YouTubeMusic.connectionInfo(connection as YouTubeMusic.YTConnection)
                break
        }
        connectionInfo.push(info)
    }

    return Response.json({ connectionInfo })
}
