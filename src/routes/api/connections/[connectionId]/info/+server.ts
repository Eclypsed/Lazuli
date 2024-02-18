import type { RequestHandler } from '@sveltejs/kit'
import { Connections } from '$lib/server/users'
import { google } from 'googleapis'

const youtubeInfo = async (connection: Connection): Promise<ConnectionInfo> => {
    const youtube = google.youtube('v3')
    const userChannelResponse = await youtube.channels.list({ mine: true, part: ['snippet'], access_token: connection.accessToken })
    const userChannel = userChannelResponse.data.items![0]

    return {
        connectionId: connection.id,
        serviceType: connection.service.type,
        username: userChannel.snippet?.title as string,
        profilePicture: userChannel.snippet?.thumbnails?.default?.url as string | undefined,
    }
}

const jellyfinInfo = async (connection: Connection): Promise<ConnectionInfo> => {
    const reqHeaders = new Headers({ Authorization: `MediaBrowser Token="${connection.accessToken}"` })

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
        serverName: systemData.ServerName,
    }
}

export const GET: RequestHandler = async ({ params }) => {
    const connectionId = params.connectionId!
    const connection = Connections.getConnection(connectionId)

    let info: ConnectionInfo
    switch (connection.service.type) {
        case 'jellyfin':
            info = await jellyfinInfo(connection)
            break
        case 'youtube-music':
            info = await youtubeInfo(connection)
            break
    }

    return Response.json({ info })
}
