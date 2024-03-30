import type { PageServerLoad } from '../$types'
import { SECRET_INTERNAL_API_KEY } from '$env/static/private'

export const load: PageServerLoad = async ({ fetch, url, locals }) => {
    const query = url.searchParams.get('query')
    if (query) {
        const searchResults: { searchResults: (Song | Album | Artist | Playlist)[] } = await fetch(`/api/search?query=${query}&userId=${locals.user.id}`, {
            method: 'GET',
            headers: { apikey: SECRET_INTERNAL_API_KEY },
        }).then((response) => response.json())

        return searchResults
    }
}
