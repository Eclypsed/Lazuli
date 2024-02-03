import type { RequestHandler } from '@sveltejs/kit'
import { SECRET_INTERNAL_API_KEY } from '$env/static/private'

// This is temporary functionally for the sake of developing the app.
// In the future will implement more robust algorith for offering recommendations
export const GET: RequestHandler = async ({ params, fetch }) => {
    const userId = params.userId as string

    const connectionsResponse = await fetch(`/api/users/${userId}/connections`, { headers: { apikey: SECRET_INTERNAL_API_KEY } })
    const userConnections: Connection[] = await connectionsResponse.json()

    const recommendations = []

    for (const connection of userConnections) {
        const { service, accessToken } = connection

        switch (service.type) {
            case 'jellyfin':
                const mostPlayedSongsSearchParams = new URLSearchParams({
                    SortBy: 'PlayCount',
                    SortOrder: 'Descending',
                    IncludeItemTypes: 'Audio',
                    Recursive: 'true',
                    limit: '10',
                })

                const mostPlayedSongsURL = new URL(`/Users/${service.userId}/Items?${mostPlayedSongsSearchParams.toString()}`, service.urlOrigin).href
                const requestHeaders = new Headers({ Authorization: `MediaBrowser Token="${accessToken}"` })

                const mostPlayedResponse = await fetch(mostPlayedSongsURL, { headers: requestHeaders })
                const mostPlayedData = await mostPlayedResponse.json()
        }
    }
}
