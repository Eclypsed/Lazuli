import { fail } from '@sveltejs/kit'
import { SECRET_INTERNAL_API_KEY } from '$env/static/private'
import { UserConnections } from '$lib/server/db/users'

const createProfile = async (connectionData) => {
    const { id, serviceType, serviceUserId, serviceUrl, accessToken, refreshToken, expiry } = connectionData

    switch (serviceType) {
        case 'jellyfin':
            const userUrl = new URL(`Users/${serviceUserId}`, serviceUrl).href
            const systemUrl = new URL('System/Info', serviceUrl).href

            const reqHeaders = new Headers({ Authorization: `MediaBrowser Token="${accessToken}"` })

            const userResponse = await fetch(userUrl, { headers: reqHeaders })
            const systemResponse = await fetch(systemUrl, { headers: reqHeaders })

            const userData = await userResponse.json()
            const systemData = await systemResponse.json()

            return {
                connectionId: id,
                serviceType,
                userId: serviceUserId,
                username: userData?.Name,
                serviceUrl: serviceUrl,
                serverName: systemData?.ServerName,
            }
        default:
            return null
    }
}

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ fetch, locals }) => {
    const response = await fetch(`/api/user/connections?userId=${locals.userId}`, {
        headers: {
            apikey: SECRET_INTERNAL_API_KEY,
        },
    })

    const allConnections = await response.json()
    const connectionProfiles = []
    if (allConnections) {
        for (const connection of allConnections) {
            const connectionProfile = await createProfile(connection)
            connectionProfiles.push(connectionProfile)
        }
    }

    return { connectionProfiles }
}

/** @type {import('./$types').Actions}} */
export const actions = {
    authenticateJellyfin: async ({ request, fetch, locals }) => {
        const formData = await request.formData()
        const queryParams = new URLSearchParams()
        for (let field of formData) {
            const [key, value] = field
            queryParams.append(key, value)
        }

        const jellyfinAuthResponse = await fetch(`/api/jellyfin/auth?${queryParams.toString()}`, {
            headers: {
                apikey: SECRET_INTERNAL_API_KEY,
            },
        })

        if (!jellyfinAuthResponse.ok) {
            const jellyfinAuthError = await jellyfinAuthResponse.text()
            return fail(jellyfinAuthResponse.status, { message: jellyfinAuthError })
        }

        const jellyfinAuthData = await jellyfinAuthResponse.json()
        const accessToken = jellyfinAuthData.AccessToken
        const jellyfinUserId = jellyfinAuthData.User.Id
        const updateConnectionsResponse = await fetch(`/api/user/connections?userId=${locals.userId}`, {
            method: 'PATCH',
            headers: {
                apikey: SECRET_INTERNAL_API_KEY,
            },
            body: JSON.stringify({ serviceType: 'jellyfin', serviceUserId: jellyfinUserId, serviceUrl: formData.get('serverUrl'), accessToken }),
        })

        if (!updateConnectionsResponse.ok) return fail(500, { message: 'Internal Server Error' })

        const newConnection = await updateConnectionsResponse.json()
        const newConnectionData = UserConnections.getConnection(newConnection.id)

        const jellyfinProfile = await createProfile(newConnectionData)

        return { newConnection: jellyfinProfile }
    },
    deleteConnection: async ({ request, fetch, locals }) => {
        const formData = await request.formData()
        const connectionId = formData.get('connectionId')

        const deleteConnectionResponse = await fetch(`/api/user/connections?userId=${locals.userId}`, {
            method: 'DELETE',
            headers: {
                apikey: SECRET_INTERNAL_API_KEY,
            },
            body: JSON.stringify({ connectionId }),
        })

        if (!deleteConnectionResponse.ok) return fail(500, { message: 'Internal Server Error' })

        return { deletedConnectionId: connectionId }
    },
}
