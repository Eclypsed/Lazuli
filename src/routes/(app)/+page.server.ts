import { SECRET_INTERNAL_API_KEY } from '$env/static/private'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, fetch }) => {
    const recommendationResponse = await fetch(`/api/users/${locals.user.id}/recommendations`, {
        headers: { apikey: SECRET_INTERNAL_API_KEY },
    }).then((response) => response.json())

    const recommendations: (Song | Album | Artist | Playlist)[] = recommendationResponse.recommendations

    return { recommendations }
}
