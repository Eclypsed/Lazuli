import { SECRET_INTERNAL_API_KEY } from '$env/static/private'

export const prerender = false

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals, fetch }) => {
    const recommendationResponse = await fetch(`/api/user/recommendations?userId=${locals.userId}&limit=10`, {
        headers: {
            apikey: SECRET_INTERNAL_API_KEY,
        },
    })
    const recommendationsData = await recommendationResponse.json()
    const { recommendations, errors } = recommendationsData

    return {
        user: locals.user,
        recommendations,
        fetchingErrors: errors,
    }
}
