import { fail } from '@sveltejs/kit'
import { SECRET_INTERNAL_API_KEY, YOUTUBE_API_CLIENT_SECRET } from '$env/static/private'
import { PUBLIC_YOUTUBE_API_CLIENT_ID } from '$env/static/public'
import type { PageServerLoad, Actions } from './$types'
import { DB } from '$lib/server/db'
import { Jellyfin, JellyfinFetchError } from '$lib/server/jellyfin'
import { google } from 'googleapis'

export const load: PageServerLoad = async ({ fetch, locals }) => {
    const connectionInfoResponse = await fetch(`/api/users/${locals.user.id}/connections`, {
        method: 'GET',
        headers: { apikey: SECRET_INTERNAL_API_KEY },
    }).then((response) => response.json())

    const connections: ConnectionInfo[] = connectionInfoResponse.connections

    return { connections }
}

export const actions: Actions = {
    authenticateJellyfin: async ({ request, fetch, locals }) => {
        const formData = await request.formData()
        const { serverUrl, username, password, deviceId } = Object.fromEntries(formData)

        if (!URL.canParse(serverUrl.toString())) return fail(400, { message: 'Invalid Server URL' })

        const authData = await Jellyfin.authenticateByName(username.toString(), password.toString(), new URL(serverUrl.toString()), deviceId.toString()).catch((error: JellyfinFetchError) => error)

        if (authData instanceof JellyfinFetchError) return fail(authData.httpCode, { message: authData.message })

        const newConnectionId = DB.addConnectionInfo({ userId: locals.user.id, type: 'jellyfin', service: { userId: authData.User.Id, serverUrl: serverUrl.toString() }, tokens: { accessToken: authData.AccessToken } })

        const response = await fetch(`/api/connections?ids=${newConnectionId}`, {
            method: 'GET',
            headers: { apikey: SECRET_INTERNAL_API_KEY },
        }).then((response) => {
            return response.json()
        })

        return { newConnection: response.connections[0] }
    },
    youtubeMusicLogin: async ({ request, fetch, locals }) => {
        const formData = await request.formData()
        const { code } = Object.fromEntries(formData)
        const client = new google.auth.OAuth2({ clientId: PUBLIC_YOUTUBE_API_CLIENT_ID, clientSecret: YOUTUBE_API_CLIENT_SECRET, redirectUri: 'http://localhost:5173' }) // DO NOT SHIP THIS. THE CLIENT SECRET SHOULD NOT BE MADE AVAILABLE TO USERS. MAKE A REQUEST TO THE LAZULI WEBSITE INSTEAD.
        const { tokens } = await client.getToken(code.toString())

        const youtube = google.youtube('v3')
        const userChannelResponse = await youtube.channels.list({ mine: true, part: ['id', 'snippet'], access_token: tokens.access_token! })
        const userChannel = userChannelResponse.data.items![0]

        const newConnectionId = DB.addConnectionInfo({
            userId: locals.user.id,
            type: 'youtube-music',
            service: { userId: userChannel.id! },
            tokens: { accessToken: tokens.access_token!, refreshToken: tokens.refresh_token!, expiry: tokens.expiry_date! },
        })

        const response = await fetch(`/api/connections?ids=${newConnectionId}`, {
            method: 'GET',
            headers: { apikey: SECRET_INTERNAL_API_KEY },
        })

        const responseData = await response.json()

        return { newConnection: responseData.connections[0] }
    },
    deleteConnection: async ({ request }) => {
        const formData = await request.formData()
        const connectionId = formData.get('connectionId')!.toString()

        DB.deleteConnectionInfo(connectionId)

        return { deletedConnectionId: connectionId }
    },
}
