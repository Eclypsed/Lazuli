import { redirect, type Handle, type HandleFetch, type RequestEvent } from '@sveltejs/kit'
import { SECRET_INTERNAL_API_KEY, SECRET_JWT_KEY } from '$env/static/private'
import jwt from 'jsonwebtoken'

function verifyAuthToken(event: RequestEvent) {
    const authToken = event.cookies.get('lazuli-auth')
    if (!authToken) return false

    try {
        jwt.verify(authToken, SECRET_JWT_KEY)
        return true
    } catch {
        return false
    }
}

export const handle: Handle = async ({ event, resolve }) => {
    const urlpath = event.url.pathname

    if (urlpath.startsWith('/login')) return resolve(event)

    if (urlpath.startsWith('/api')) {
        if (event.request.headers.get('apikey') === SECRET_INTERNAL_API_KEY || event.url.searchParams.get('apikey') === SECRET_INTERNAL_API_KEY || verifyAuthToken(event)) {
            return resolve(event)
        }

        return new Response('Unauthorized', { status: 401 })
    }

    const authToken = event.cookies.get('lazuli-auth')
    if (!authToken) throw redirect(303, `/login?redirect=${urlpath}`)

    try {
        const tokenData = jwt.verify(authToken, SECRET_JWT_KEY) as Omit<User, 'passwordHash'>
        event.locals.user = tokenData
    } catch {
        throw redirect(303, `/login?redirect=${urlpath}`)
    }

    return resolve(event)
}

export const handleFetch: HandleFetch = async ({ event, request, fetch }) => {
    const authorized = verifyAuthToken(event)

    return authorized ? fetch(request) : new Response('Unauthorized', { status: 401 })
}
