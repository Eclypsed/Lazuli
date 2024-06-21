import { redirect, type Handle, type RequestEvent } from '@sveltejs/kit'
import { SECRET_INTERNAL_API_KEY, SECRET_JWT_KEY } from '$env/static/private'
import { userExists, mixExists } from '$lib/server/api-helper'
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

const unauthorizedResponse = new Response('Unauthorized.', { status: 401 })
const userNotFoundResponse = new Response('User not found.', { status: 404 })
const mixNotFoundResponse = new Response('Mix not found.', { status: 404 })

// * Custom Handle specifically for requests made to the API endpoint. Handles authorization and any other middleware verifications
const handleAPIRequest: Handle = async ({ event, resolve }) => {
    const authorized = event.request.headers.get('apikey') === SECRET_INTERNAL_API_KEY || event.url.searchParams.get('apikey') === SECRET_INTERNAL_API_KEY || verifyAuthToken(event)
    if (!authorized) unauthorizedResponse

    const userId = event.params.userId
    if (userId && !(await userExists(userId))) return userNotFoundResponse

    const mixId = event.params.mixId
    if (mixId && !(await mixExists(mixId))) return mixNotFoundResponse

    return resolve(event)
}

export const handle: Handle = async ({ event, resolve }) => {
    const urlpath = event.url.pathname

    if (urlpath.startsWith('/login')) return resolve(event)

    if (urlpath.startsWith('/api')) return handleAPIRequest({ event, resolve })

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
