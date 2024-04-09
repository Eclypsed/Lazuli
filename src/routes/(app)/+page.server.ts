import { SECRET_INTERNAL_API_KEY } from '$env/static/private'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, fetch }) => {
    const getRecommendations = async (): Promise<(Song | Album | Artist | Playlist)[]> => {
        const recommendationResponse = await fetch(`/api/users/${locals.user.id}/recommendations`, {
            headers: { apikey: SECRET_INTERNAL_API_KEY },
        }).then((response) => response.json())
        return recommendationResponse.recommendations
    }

    return { recommendations: getRecommendations() }
}
