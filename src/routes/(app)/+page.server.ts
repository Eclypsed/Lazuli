import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, fetch }) => {
    const getRecommendations = async () =>
        fetch(`/api/users/${locals.user.id}/recommendations`)
            .then((response) => response.json() as Promise<{ recommendations: (Song | Album | Artist | Playlist)[] }>)
            .then((data) => data.recommendations)

    return { recommendations: getRecommendations() }
}
