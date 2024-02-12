import { fail } from '@sveltejs/kit'
import { SECRET_INTERNAL_API_KEY, YOUTUBE_API_CLIENT_SECRET } from '$env/static/private'
import { PUBLIC_YOUTUBE_API_CLIENT_ID } from '$env/static/public'
import type { PageServerLoad, Actions } from './$types'
import { google } from 'googleapis'

export const load: PageServerLoad = async ({ fetch, locals }) => {
    const connectionsResponse = await fetch(`/api/users/${locals.user.id}/connections`, {
        method: 'GET',
        headers: { apikey: SECRET_INTERNAL_API_KEY },
    })

    const userConnections: Connection[] = await connectionsResponse.json()
    return { userConnections }
}

export const actions: Actions = {
    authenticateJellyfin: async ({ request, fetch, locals }) => {
        const formData = await request.formData()
        const { serverUrl, username, password, deviceId } = Object.fromEntries(formData)

        const jellyfinAuthResponse = await fetch('/api/jellyfin/auth', {
            method: 'POST',
            headers: { apikey: SECRET_INTERNAL_API_KEY },
            body: JSON.stringify({ serverUrl, username, password, deviceId }),
        })

        if (!jellyfinAuthResponse.ok) {
            if (jellyfinAuthResponse.status === 404) {
                return fail(404, { message: 'Request failed, check Server URL' })
            } else if (jellyfinAuthResponse.status === 401) {
                return fail(401, { message: 'Invalid Credentials' })
            }

            return fail(500, { message: 'Internal Server Error' })
        }

        const authData: Jellyfin.AuthData = await jellyfinAuthResponse.json()

        const userUrl = new URL(`Users/${authData.User.Id}`, serverUrl.toString()).href
        const systemUrl = new URL('System/Info', serverUrl.toString()).href

        const reqHeaders = new Headers({ Authorization: `MediaBrowser Token="${authData.AccessToken}"` })

        const userResponse = await fetch(userUrl, { headers: reqHeaders })
        const systemResponse = await fetch(systemUrl, { headers: reqHeaders })

        const userData: Jellyfin.User = await userResponse.json()
        const systemData: Jellyfin.System = await systemResponse.json()

        const serviceData: Jellyfin.JFService = {
            type: 'jellyfin',
            userId: authData.User.Id,
            urlOrigin: serverUrl.toString(),
            username: userData.Name,
            serverName: systemData.ServerName,
        }
        const tokenData: Jellyfin.JFTokens = {
            accessToken: authData.AccessToken,
        }

        const newConnectionResponse = await fetch(`/api/users/${locals.user.id}/connections`, {
            method: 'POST',
            headers: { apikey: SECRET_INTERNAL_API_KEY },
            body: JSON.stringify({ service: serviceData, tokens: tokenData }),
        })

        if (!newConnectionResponse.ok) return fail(500, { message: 'Internal Server Error' })

        const newConnection: Jellyfin.JFConnection = await newConnectionResponse.json()
        return { newConnection }
    },
    youtubeMusicLogin: async ({ request, fetch, locals }) => {
        const formData = await request.formData()
        const { code } = Object.fromEntries(formData)
        const client = new google.auth.OAuth2({ clientId: PUBLIC_YOUTUBE_API_CLIENT_ID, clientSecret: YOUTUBE_API_CLIENT_SECRET, redirectUri: 'http://localhost:5173' }) // DO NOT SHIP THIS. THE CLIENT SECRET SHOULD NOT BE MADE AVAILABLE TO USERS. MAKE A REQUEST TO THE LAZULI WEBSITE INSTEAD.
        const { tokens } = await client.getToken(code.toString())

        const tokenData: YouTubeMusic.YTTokens = {
            accessToken: tokens.access_token as string,
            refreshToken: tokens.refresh_token as string,
            expiry: tokens.expiry_date as number,
        }

        const youtube = google.youtube('v3')
        const userChannelResponse = await youtube.channels.list({ mine: true, part: ['id', 'snippet'], access_token: tokenData.accessToken })
        const userChannel = userChannelResponse.data.items![0]

        const serviceData: YouTubeMusic.YTService = {
            type: 'youtube-music',
            userId: userChannel.id as string,
            urlOrigin: 'https://www.googleapis.com/youtube/v3',
            username: userChannel.snippet?.title as string,
            profilePicture: userChannel.snippet?.thumbnails?.default?.url as string | undefined,
        }

        const newConnectionResponse = await fetch(`/api/users/${locals.user.id}/connections`, {
            method: 'POST',
            headers: { apikey: SECRET_INTERNAL_API_KEY },
            body: JSON.stringify({ service: serviceData, tokens: tokenData }),
        })

        if (!newConnectionResponse.ok) return fail(500, { message: 'Internal Server Error' })

        const newConnection: YouTubeMusic.YTConnection = await newConnectionResponse.json()
        return { newConnection }
    },
    deleteConnection: async ({ request, fetch, locals }) => {
        const formData = await request.formData()
        const connectionId = formData.get('connectionId')

        const deleteConnectionResponse = await fetch(`/api/users/${locals.user.id}/connections`, {
            method: 'DELETE',
            headers: { apikey: SECRET_INTERNAL_API_KEY },
            body: JSON.stringify({ connectionId }),
        })

        if (!deleteConnectionResponse.ok) return fail(500, { message: 'Internal Server Error' })

        return { deletedConnectionId: connectionId }
    },
}
