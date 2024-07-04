import { fail } from '@sveltejs/kit'
import { YOUTUBE_API_CLIENT_SECRET } from '$env/static/private'
import { PUBLIC_YOUTUBE_API_CLIENT_ID } from '$env/static/public'
import type { PageServerLoad, Actions } from './$types'
import { DB } from '$lib/server/db'
import { Jellyfin } from '$lib/server/jellyfin'
import { google } from 'googleapis'
import ky from 'ky'

export const load: PageServerLoad = async ({ fetch, locals, url }) => {
    const getConnectionInfo = () =>
        ky
            .get(`api/users/${locals.user.id}/connections`, { fetch, prefixUrl: url.origin })
            .json<{ connections: ConnectionInfo[] }>()
            .then((response) => response.connections)
            .catch(() => ({ error: 'Failed to retrieve connections' }))

    return { connections: getConnectionInfo() }
}

export const actions: Actions = {
    authenticateJellyfin: async ({ request, fetch, locals, url }) => {
        const formData = await request.formData()
        const { serverUrl, username, password, deviceId } = Object.fromEntries(formData)

        if (!URL.canParse(serverUrl.toString())) return fail(400, { message: 'Invalid Server URL' })

        const authData = await Jellyfin.authenticateByName(username.toString(), password.toString(), new URL(serverUrl.toString()), deviceId.toString()).catch(() => null)

        if (!authData) return fail(400, { message: 'Failed to Authenticate' })

        const userId = locals.user.id
        const serviceUserId = authData.User.Id
        const accessToken = authData.AccessToken

        const newConnectionId = await DB.connections.insert({ id: DB.uuid(), userId, type: 'jellyfin', serviceUserId, serverUrl: serverUrl.toString(), accessToken }, 'id').then((data) => data[0].id)

        const connectionsResponse = await ky.get(`api/connections?id=${newConnectionId}`, { fetch, prefixUrl: url.origin }).json<{ connections: ConnectionInfo[] }>()
        const newConnection = connectionsResponse.connections[0]

        return { newConnection }
    },
    youtubeMusicLogin: async ({ request, fetch, locals, url }) => {
        const formData = await request.formData()
        const { code } = Object.fromEntries(formData)
        const client = new google.auth.OAuth2({ clientId: PUBLIC_YOUTUBE_API_CLIENT_ID, clientSecret: YOUTUBE_API_CLIENT_SECRET, redirectUri: 'http://localhost:5173' }) // ! DO NOT SHIP THIS. THE CLIENT SECRET SHOULD NOT BE MADE AVAILABLE TO USERS. MAKE A REQUEST TO THE LAZULI WEBSITE INSTEAD.
        const { access_token, refresh_token, expiry_date } = (await client.getToken(code.toString())).tokens

        const youtube = google.youtube('v3')
        const userChannelResponse = await youtube.channels.list({ mine: true, part: ['id', 'snippet'], access_token: access_token! })
        const userChannel = userChannelResponse.data.items![0]

        const userId = locals.user.id
        const serviceUserId = userChannel.id!

        const newConnectionId = await DB.connections
            .insert({ id: DB.uuid(), userId, type: 'youtube-music', serviceUserId, accessToken: access_token!, refreshToken: refresh_token!, expiry: expiry_date! }, 'id')
            .then((data) => data[0].id)

        const connectionsResponse = await ky.get(`api/connections?id=${newConnectionId}`, { fetch, prefixUrl: url.origin }).json<{ connections: ConnectionInfo[] }>()
        const newConnection = connectionsResponse.connections[0]

        return { newConnection }
    },
    deleteConnection: async ({ request }) => {
        const formData = await request.formData()
        const connectionId = formData.get('connectionId')!.toString()

        await DB.connections.where('id', connectionId).del()

        return { deletedConnectionId: connectionId }
    },
}
