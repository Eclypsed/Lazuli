import { fail } from '@sveltejs/kit'
import { SECRET_INTERNAL_API_KEY, YOUTUBE_API_CLIENT_SECRET } from '$env/static/private'
import { PUBLIC_YOUTUBE_API_CLIENT_ID } from '$env/static/public'
import type { PageServerLoad, Actions } from './$types'
import { Connections } from '$lib/server/users'
import { google } from 'googleapis'

export const load: PageServerLoad = async ({ fetch, locals }) => {
    const connectionsResponse = await fetch(`/api/users/${locals.user.id}/connections`, {
        method: 'GET',
        headers: { apikey: SECRET_INTERNAL_API_KEY },
    })

    const userConnections = await connectionsResponse.json()

    return { connections: userConnections.connections }
}

export const actions: Actions = {
    authenticateJellyfin: async ({ request, fetch, locals }) => {
        const formData = await request.formData()
        const { serverUrl, username, password, deviceId } = Object.fromEntries(formData)

        const authUrl = new URL('/Users/AuthenticateByName', serverUrl.toString()).href
        let authData: Jellyfin.AuthData
        try {
            const authResponse = await fetch(authUrl, {
                method: 'POST',
                body: JSON.stringify({
                    Username: username,
                    Pw: password,
                }),
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'X-Emby-Authorization': `MediaBrowser Client="Lazuli", Device="Chrome", DeviceId="${deviceId}", Version="1.0.0.0"`,
                },
            })

            if (!authResponse.ok) return fail(401, { message: 'Failed to authenticate' })

            authData = await authResponse.json()
        } catch {
            return fail(400, { message: 'Could not reach Jellyfin server' })
        }

        const newConnection = Connections.addConnection('jellyfin', {
            userId: locals.user.id,
            service: { userId: authData.User.Id, urlOrigin: serverUrl.toString() },
            tokens: { accessToken: authData.AccessToken },
        })

        return { newConnection }
    },
    youtubeMusicLogin: async ({ request, locals }) => {
        const formData = await request.formData()
        const { code } = Object.fromEntries(formData)
        const client = new google.auth.OAuth2({ clientId: PUBLIC_YOUTUBE_API_CLIENT_ID, clientSecret: YOUTUBE_API_CLIENT_SECRET, redirectUri: 'http://localhost:5173' }) // DO NOT SHIP THIS. THE CLIENT SECRET SHOULD NOT BE MADE AVAILABLE TO USERS. MAKE A REQUEST TO THE LAZULI WEBSITE INSTEAD.
        const { tokens } = await client.getToken(code.toString())

        const youtube = google.youtube('v3')
        const userChannelResponse = await youtube.channels.list({ mine: true, part: ['id', 'snippet'], access_token: tokens.access_token! })
        const userChannel = userChannelResponse.data.items![0]

        const newConnection = Connections.addConnection('youtube-music', {
            userId: locals.user.id,
            service: { userId: userChannel.id! },
            tokens: { accessToken: tokens.access_token!, refreshToken: tokens.refresh_token!, expiry: tokens.expiry_date! },
        })

        return { newConnection }
    },
    deleteConnection: async ({ request }) => {
        const formData = await request.formData()
        const connectionId = formData.get('connectionId')!.toString()

        Connections.deleteConnection(connectionId)

        return { deletedConnectionId: connectionId }
    },
}
