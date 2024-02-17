import { YOUTUBE_API_CLIENT_SECRET } from '$env/static/private'
import { PUBLIC_YOUTUBE_API_CLIENT_ID } from '$env/static/public'
import { Connections } from '$lib/server/users'
import { google } from 'googleapis'

export class YouTubeMusic {
    static refreshAccessToken = async (connectionId: string, refreshToken: string): Promise<Tokens> => {
        // Again DON'T SHIP THIS, CLIENT SECRET SHOULD NOT BE EXPOSED TO USERS
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            body: JSON.stringify({
                client_id: PUBLIC_YOUTUBE_API_CLIENT_ID,
                client_secret: YOUTUBE_API_CLIENT_SECRET,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
            }),
        })
        const { access_token, expires_in } = await response.json()
        const newTokens: Tokens = {
            accessToken: access_token,
            refreshToken,
            expiry: Date.now() + expires_in * 1000,
        }
        Connections.updateTokens(connectionId, newTokens)
        return newTokens
    }

    static connectionInfo = async (connection: YouTubeMusic.YTConnection): Promise<ConnectionInfo> => {
        let accessToken = connection.tokens.accessToken
        if (Date.now() > connection.tokens.expiry) {
            const newTokenData = await this.refreshAccessToken(connection.id, connection.tokens.refreshToken)
            accessToken = newTokenData.accessToken
        }

        const youtube = google.youtube('v3')
        const userChannelResponse = await youtube.channels.list({ mine: true, part: ['snippet'], access_token: accessToken })
        const userChannel = userChannelResponse.data.items![0]

        return {
            connectionId: connection.id,
            serviceType: connection.service.type,
            username: userChannel.snippet?.title as string,
            profilePicture: userChannel.snippet?.thumbnails?.default?.url as string | undefined,
        }
    }
}
