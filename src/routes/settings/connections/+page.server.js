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
        const connectionsData = await response.json()
        if (connectionsData) {
            const serviceNames = connectionsData.map((connection) => connection.serviceName)
            return { existingConnections: serviceNames }
        }
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
        const jellyfinAccessToken = jellyfinAuthData.AccessToken
        const updateConnectionsResponse = await fetch('/api/user/connections', {
            method: 'PATCH',
            headers: {
                apikey: SECRET_INTERNAL_API_KEY,
                userId: locals.userId,
            },
            body: JSON.stringify({ serviceName: 'jellyfin', accessToken: jellyfinAccessToken }),
        })

        if (!updateConnectionsResponse.ok) return fail(500, { message: 'Internal Server Error' })

        return { message: 'Updated Jellyfin connection' }
    },
    deleteConnection: async ({ request, fetch, locals }) => {
        const formData = await request.formData()
        const serviceName = formData.get('service')

        const deleteConnectionResponse = await fetch('/api/user/connections', {
            method: 'DELETE',
            headers: {
                apikey: SECRET_INTERNAL_API_KEY,
                userId: locals.userId,
            },
            body: JSON.stringify({ serviceName }),
        })

        if (!deleteConnectionResponse.ok) return fail(500, { message: 'Internal Server Error' })

        return { message: 'Connection deleted' }
    },
}
