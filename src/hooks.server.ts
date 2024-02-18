import { redirect, type Handle, type HandleFetch } from '@sveltejs/kit'
import { SECRET_JWT_KEY, SECRET_INTERNAL_API_KEY, YOUTUBE_API_CLIENT_SECRET } from '$env/static/private'
import { PUBLIC_YOUTUBE_API_CLIENT_ID } from '$env/static/public'
import { Connections } from '$lib/server/users'
import jwt from 'jsonwebtoken'

export const handle: Handle = async ({ event, resolve }) => {
    const nonJwtProtectedRoutes = ['/login', '/api']
    const urlpath = event.url.pathname

    if (urlpath.startsWith('/api') && event.request.headers.get('apikey') !== SECRET_INTERNAL_API_KEY && event.url.searchParams.get('apikey') !== SECRET_INTERNAL_API_KEY) {
        return new Response('Unauthorized', { status: 401 })
    }

    if (!nonJwtProtectedRoutes.some((route) => urlpath.startsWith(route))) {
        const authToken = event.cookies.get('lazuli-auth')
        if (!authToken) throw redirect(303, `/login?redirect=${urlpath}`)

        try {
            const tokenData = jwt.verify(authToken, SECRET_JWT_KEY) as User
            event.locals.user = tokenData
        } catch {
            throw redirect(303, `/login?redirect=${urlpath}`)
        }
    }

    const response = await resolve(event)
    return response
}

// Access token refresh middleware - checks for expired connections and refreshes them accordingly
export const handleFetch: HandleFetch = async ({ request, fetch, event }) => {
    if (event.locals.user) {
        const expiredConnection = Connections.getExpiredConnections(event.locals.user.id)
        for (const connection of expiredConnection) {
            switch (connection.service.type) {
                case 'youtube-music':
                    // Again DON'T SHIP THIS, CLIENT SECRET SHOULD NOT BE EXPOSED TO USERS
                    const response = await fetch('https://oauth2.googleapis.com/token', {
                        method: 'POST',
                        body: JSON.stringify({
                            client_id: PUBLIC_YOUTUBE_API_CLIENT_ID,
                            client_secret: YOUTUBE_API_CLIENT_SECRET,
                            refresh_token: connection.refreshToken as string,
                            grant_type: 'refresh_token',
                        }),
                    })
                    const { access_token, expires_in } = await response.json()
                    const newExpiry = Date.now() + expires_in * 1000
                    Connections.updateTokens(connection.id, access_token, connection.refreshToken, newExpiry)
                    console.log('Refreshed YouTubeMusic access token')
            }
        }
    }

    return fetch(request)
}
