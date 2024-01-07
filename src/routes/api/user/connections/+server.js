import { UserConnections } from '$lib/server/db/users'
import Joi from 'joi'

/** @type {import('./$types').RequestHandler} */
export async function GET({ request, url }) {
    const schema = Joi.number().required()
    const userId = request.headers.get('userId')

    const validation = schema.validate(userId)
    if (validation.error) return new Response(validation.error.message, { status: 400 })

    const responseHeaders = new Headers({
        'Content-Type': 'application/json',
    })

    const filter = url.searchParams.get('filter')
    if (filter) {
        const requestedConnections = filter.split(',').map((item) => item.toLowerCase())
        const userConnections = UserConnections.getConnections(userId, requestedConnections)
        return new Response(JSON.stringify(userConnections), { headers: responseHeaders })
    }

    const userConnections = UserConnections.getConnections(userId)
    return new Response(JSON.stringify(userConnections), { headers: responseHeaders })
}

// May need to add support for refresh token and expiry in the future
/** @type {import('./$types').RequestHandler} */
export async function PATCH({ request }) {
    const schema = Joi.object({
        userId: Joi.number().required(),
        connection: Joi.object({
            serviceType: Joi.string().required(),
            accessToken: Joi.string().required(),
            refreshToken: Joi.string(),
            expiry: Joi.number(),
            connectionInfo: Joi.string(),
        }).required(),
    })

    const userId = request.headers.get('userId')
    const connection = await request.json()

    const validation = schema.validate({ userId, connection })
    if (validation.error) return new Response(validation.error.message, { status: 400 })

    const { serviceType, accessToken, refreshToken, expiry, connectionInfo } = connection
    const newConnectionId = UserConnections.addConnection(userId, serviceType, accessToken, { refreshToken, expiry, connectionInfo })

    return new Response(JSON.stringify({ id: newConnectionId }))
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE({ request }) {
    const schema = Joi.object({
        userId: Joi.number().required(),
        connection: Joi.object({
            serviceId: Joi.string().required(),
        }).required(),
    })

    const userId = request.headers.get('userId')
    const connection = await request.json()

    const validation = schema.validate({ userId, connection })
    if (validation.error) return new Response(validation.error.message, { status: 400 })

    const deletedConnectionId = UserConnections.deleteConnection(userId, connection.serviceId)

    return new Response(JSON.stringify({ id: deletedConnectionId }))
}
