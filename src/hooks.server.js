import { redirect } from '@sveltejs/kit'
import { SECRET_JWT_KEY, SECRET_INTERNAL_API_KEY } from '$env/static/private'
import jwt from 'jsonwebtoken'

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    const nonProtectedRoutes = ['/login']
    const urlpath = event.url.pathname

    if (urlpath.startsWith('/api') && event.request.headers.get('apikey') !== SECRET_INTERNAL_API_KEY) {
        return new Response('Unauthorized', { status: 400 })
    }

    if (!nonProtectedRoutes.some((route) => urlpath.startsWith(route))) {
        const authToken = event.cookies.get('lazuli-auth')
        if (!authToken) throw redirect(303, `/login?redirect=${urlpath}`)

        const tokenData = jwt.verify(authToken, SECRET_JWT_KEY)
        if (!tokenData) throw redirect(303, `/login?redirect=${urlpath}`)

        event.locals.userId = tokenData.id
        event.locals.username = tokenData.user
    }

    const response = await resolve(event)
    return response
}
