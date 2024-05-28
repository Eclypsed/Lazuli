import { redirect, type Handle } from '@sveltejs/kit'
import { SECRET_JWT_KEY, SECRET_INTERNAL_API_KEY } from '$env/static/private'
import jwt from 'jsonwebtoken'

export const handle: Handle = async ({ event, resolve }) => {
    const nonJwtProtectedRoutes = ['/login', '/api']
    const urlpath = event.url.pathname

    if (urlpath.startsWith('/api')) {
        const unprotectedAPIRoutes = ['/api/audio', '/api/remoteImage']

        function checkAuthorization(): boolean {
            const apikey = event.request.headers.get('apikey') || event.url.searchParams.get('apikey')
            if (apikey === SECRET_INTERNAL_API_KEY) return true

            const authToken = event.cookies.get('lazuli-auth')
            if (!authToken) return false

            try {
                jwt.verify(authToken, SECRET_JWT_KEY)
                return true
            } catch {
                return false
            }
        }

        if (!unprotectedAPIRoutes.includes(urlpath) && !checkAuthorization()) {
            return new Response('Unauthorized', { status: 401 })
        }
    }

    if (!nonJwtProtectedRoutes.some((route) => urlpath.startsWith(route))) {
        const authToken = event.cookies.get('lazuli-auth')
        if (!authToken) throw redirect(303, `/login?redirect=${urlpath}`)

        try {
            const tokenData = jwt.verify(authToken, SECRET_JWT_KEY) as Omit<User, 'passwordHash'>
            event.locals.user = tokenData
        } catch {
            throw redirect(303, `/login?redirect=${urlpath}`)
        }
    }

    const response = await resolve(event)
    return response
}
