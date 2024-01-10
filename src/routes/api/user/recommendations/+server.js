import { SECRET_INTERNAL_API_KEY } from '$env/static/private'
import { JellyfinUtils } from '$lib/utils/utils'
import Joi from 'joi'

/** @type {import('./$types').RequestHandler} */
export async function GET({ url, fetch }) {
    const { userId, limit } = Object.fromEntries(url.searchParams)
    if (!(userId && limit)) return new Response('userId and limit parameter required', { status: 400 })

    const connectionsResponse = await fetch(`/api/user/connections?userId=${userId}`, {
        headers: {
            apikey: SECRET_INTERNAL_API_KEY,
        },
    })
    const allConnections = await connectionsResponse.json()

    const recommendations = []
    const errors = []

    for (const connectionData of allConnections) {
        const { id, serviceType, serviceUserId, serviceUrl, accessToken } = connectionData

        switch (serviceType) {
            case 'jellyfin':
                const mostPlayedSongsSearchParams = new URLSearchParams({
                    SortBy: 'PlayCount',
                    SortOrder: 'Descending',
                    IncludeItemTypes: 'Audio',
                    Recursive: true,
                    limit,
                })

                const mostPlayedSongsUrl = new URL(`Users/${serviceUserId}/Items?${mostPlayedSongsSearchParams.toString()}`, serviceUrl).href
                const reqHeaders = new Headers({ Authorization: `MediaBrowser Token="${accessToken}"` })

                const mostPlayedResponse = await fetch(mostPlayedSongsUrl, { headers: reqHeaders })
                const mostPlayedData = await mostPlayedResponse.json()

                const schema = Joi.object({
                    Items: Joi.array().length(Number(limit)).required(),
                }).unknown(true)

                const validation = schema.validate(mostPlayedData)
                if (validation.error) {
                    errors.push(validation.error.message)
                    break
                }

                mostPlayedData.Items.forEach((song) => recommendations.push(JellyfinUtils.mediaItemFactory(song, connectionData)))
                break
        }
    }

    return new Response(JSON.stringify({ recommendations, errors }))
}
