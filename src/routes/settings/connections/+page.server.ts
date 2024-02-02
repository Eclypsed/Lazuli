import { fail } from '@sveltejs/kit'
import { SECRET_INTERNAL_API_KEY } from '$env/static/private'
import type { PageServerLoad, Actions } from './$types'

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
        const newConnectionResponse = await fetch(`/api/users/${locals.user.id}/connections`, {
            method: 'POST',
            headers: { apikey: SECRET_INTERNAL_API_KEY },
            body: JSON.stringify({ service: serviceData, accessToken: authData.AccessToken }),
        })

        if (!newConnectionResponse.ok) return fail(500, { message: 'Internal Server Error' })

        const newConnection: Jellyfin.JFConnection = await newConnectionResponse.json()
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
