import type { RequestHandler } from '@sveltejs/kit'
import { Connections } from '$lib/server/users'
import { google } from 'googleapis'

const jellyfinInfo = async (connection: Jellyfin.JFConnection): Promise<Jellyfin.JFConnectionInfo> => {
    const reqHeaders = new Headers({ Authorization: `MediaBrowser Token="${connection.tokens.accessToken}"` })

    const userUrl = new URL(`Users/${connection.service.userId}`, connection.service.urlOrigin).href
    const systemUrl = new URL('System/Info', connection.service.urlOrigin).href

    const userResponse = await fetch(userUrl, { headers: reqHeaders })
    const systemResponse = await fetch(systemUrl, { headers: reqHeaders })

    const userData: Jellyfin.User = await userResponse.json()
    const systemData: Jellyfin.System = await systemResponse.json()

    return {
        connectionId: connection.id,
        serviceType: 'jellyfin',
        username: userData.Name,
        servername: systemData.ServerName,
    }
}

const youtubeInfo = async (connection: YouTubeMusic.YTConnection): Promise<YouTubeMusic.YTConnectionInfo> => {
    const youtube = google.youtube('v3')
    const userChannelResponse = await youtube.channels.list({ mine: true, part: ['snippet'], access_token: connection.tokens.accessToken })
    const userChannel = userChannelResponse.data.items![0]

    return {
        connectionId: connection.id,
        serviceType: connection.service.type,
        username: userChannel.snippet?.title as string,
        profilePicture: userChannel.snippet?.thumbnails?.default?.url as string | undefined,
    }
}

export const GET: RequestHandler = async ({ params, url }) => {
    const userId = params.userId as string
    const requestedConnectionIds = url.searchParams.get('connectionIds')?.split(',')

    const connectionInfo: ConnectionInfo[] = []

    const userConnections: Connection[] = requestedConnectionIds ? Array.from(requestedConnectionIds, (id) => Connections.getConnection(id)) : Connections.getUserConnections(userId)

    for (const connection of userConnections) {
        let info: ConnectionInfo
        switch (connection.service.type) {
            case 'jellyfin':
                info = await jellyfinInfo(connection as Jellyfin.JFConnection)
                break
            case 'youtube-music':
                info = await youtubeInfo(connection as YouTubeMusic.YTConnection)
                break
        }
        connectionInfo.push(info)
    }

    return Response.json({ connectionInfo })
}
