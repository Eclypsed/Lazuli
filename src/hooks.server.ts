import { redirect, type Handle } from '@sveltejs/kit'
import { SECRET_JWT_KEY, SECRET_INTERNAL_API_KEY } from '$env/static/private'
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
