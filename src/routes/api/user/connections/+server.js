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
            serviceName: Joi.string().required(),
            accessToken: Joi.string().required(),
        }).required(),
    })

    const userId = request.headers.get('userId')
    const connection = await request.json()

    const validation = schema.validate({ userId, connection })
    if (validation.error) return new Response(validation.error.message, { status: 400 })

    UserConnections.setConnection(userId, connection.serviceName, connection.accessToken)

    return new Response('Updated Connection')
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE({ request }) {
    const schema = Joi.object({
        userId: Joi.number().required(),
        connection: Joi.object({
            serviceName: Joi.string().required(),
        }).required(),
    })

    const userId = request.headers.get('userId')
    const connection = await request.json()

    const validation = schema.validate({ userId, connection })
    if (validation.error) return new Response(validation.error.message, { status: 400 })

    UserConnections.deleteConnection(userId, connection.serviceName)

    return new Response('Deleted Connection')
}
