import { fail } from '@sveltejs/kit'
import { SECRET_INTERNAL_API_KEY } from '$env/static/private'

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ fetch, locals }) => {
    const response = await fetch('/api/user/connections', {
        headers: {
            apikey: SECRET_INTERNAL_API_KEY,
            userId: locals.userId,
        },
    })
    if (response.ok) {
        const connectionData = await response.json()
        const clientConnectionData = {}
        connectionData?.forEach((connection) => {
            const { id, serviceType, connectionInfo } = connection
            clientConnectionData[id] = {
                serviceType,
                connectionInfo: JSON.parse(connectionInfo),
            }
        })
        return { existingConnections: clientConnectionData }
    } else {
        const error = await response.text()
        console.log(error)
    }
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
        const { User, AccessToken, ServerId } = jellyfinAuthData
        const connectionInfo = JSON.stringify({ User, ServerId })
        const updateConnectionsResponse = await fetch('/api/user/connections', {
            method: 'PATCH',
            headers: {
                apikey: SECRET_INTERNAL_API_KEY,
                userId: locals.userId,
            },
            body: JSON.stringify({ serviceType: 'jellyfin', accessToken: AccessToken, connectionInfo }),
        })

        if (!updateConnectionsResponse.ok) return fail(500, { message: 'Internal Server Error' })

        const newConnectionData = await updateConnectionsResponse.json()

        return { message: 'Added Jellyfin connection', newConnection: { id: newConnectionData.id, serviceType: 'jellyfin', connectionInfo: JSON.parse(connectionInfo) } }
    },
    deleteConnection: async ({ request, fetch, locals }) => {
        const formData = await request.formData()
        const serviceId = formData.get('serviceId')

        const deleteConnectionResponse = await fetch('/api/user/connections', {
            method: 'DELETE',
            headers: {
                apikey: SECRET_INTERNAL_API_KEY,
                userId: locals.userId,
            },
            body: JSON.stringify({ serviceId }),
        })

        if (!deleteConnectionResponse.ok) return fail(500, { message: 'Internal Server Error' })

        const deletedConnectionData = await deleteConnectionResponse.json()

        return { message: 'Connection deleted', deletedConnection: { id: deletedConnectionData.id } }
    },
}
