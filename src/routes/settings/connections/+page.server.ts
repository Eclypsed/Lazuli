import { fail } from '@sveltejs/kit'
import { SECRET_INTERNAL_API_KEY } from '$env/static/private'
import type { DBConnectionData } from '$lib/server/users'
import type { NewConnection } from '../../api/users/[userId]/connections/+server'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async ({ fetch, locals }) => {
    const connectionsResponse = await fetch(`/api/user/${locals.user.id}/connections`, {
        method: 'GET',
        headers: { apikey: SECRET_INTERNAL_API_KEY },
    })

    const userConnections: DBConnectionData[] = await connectionsResponse.json()
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
            const authError = await jellyfinAuthResponse.text()
            return fail(jellyfinAuthResponse.status, { message: authError })
        }

        const authData: Jellyfin.AuthData = await jellyfinAuthResponse.json()
        const newConnectionPayload: NewConnection = {
            url: serverUrl.toString(),
            serviceType: 'jellyfin',
            serviceUserId: authData.User.Id,
            accessToken: authData.AccessToken,
        }
        const newConnectionResponse = await fetch(`/api/users/${locals.user.id}/connections`, {
            method: 'POST',
            headers: { apikey: SECRET_INTERNAL_API_KEY },
            body: JSON.stringify(newConnectionPayload),
        })

        if (!newConnectionResponse.ok) return fail(500, { message: 'Internal Server Error' })

        const newConnection: DBConnectionData = await newConnectionResponse.json()
        return { newConnection }
    },
}
