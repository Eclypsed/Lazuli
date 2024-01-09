import { UserConnections } from '$lib/server/db/users'
import Joi from 'joi'

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
    const { userId, filter } = Object.fromEntries(url.searchParams)
    if (!userId) return new Response('Requires User Id', { status: 400 })

    const responseHeaders = new Headers({
        'Content-Type': 'application/json',
    })

    if (filter) {
        const requestedConnections = filter.split(',').map((item) => item.toLowerCase())
        const userConnections = UserConnections.getUserConnections(userId, requestedConnections)
        return new Response(JSON.stringify(userConnections), { headers: responseHeaders })
    }

    const userConnections = UserConnections.getUserConnections(userId)
    return new Response(JSON.stringify(userConnections), { headers: responseHeaders })
}

// May need to add support for refresh token and expiry in the future
/** @type {import('./$types').RequestHandler} */
export async function PATCH({ request, url }) {
    const schema = Joi.object({
        userId: Joi.required(),
        connection: Joi.object({
            serviceType: Joi.string().required(),
            serviceUserId: Joi.string().required(),
            serviceUrl: Joi.string().required(),
            accessToken: Joi.string().required(),
            refreshToken: Joi.string(),
            expiry: Joi.number(),
        }).required(),
    })

    const userId = url.searchParams.get('userId')
    const connection = await request.json()

    const validation = schema.validate({ userId, connection })
    if (validation.error) return new Response(validation.error.message, { status: 400 })

    const { serviceType, serviceUserId, serviceUrl, accessToken, refreshToken, expiry } = connection
    const newConnectionId = UserConnections.addConnection(userId, serviceType, serviceUserId, serviceUrl, accessToken, { refreshToken, expiry })

    return new Response(JSON.stringify({ id: newConnectionId }))
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE({ request, url }) {
    const schema = Joi.object({
        userId: Joi.required(),
        connection: Joi.object({
            connectionId: Joi.string().required(),
        }).required(),
    })

    const userId = url.searchParams.get('userId')
    const connection = await request.json()

    const validation = schema.validate({ userId, connection })
    if (validation.error) return new Response(validation.error.message, { status: 400 })

    UserConnections.deleteConnection(userId, connection.connectionId)

    return new Response('Connection deleted', { status: 200 })
}
