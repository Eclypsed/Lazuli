import type { PageServerLoad } from '../$types'

export const load: PageServerLoad = async ({ fetch, url, locals }) => {
    const query = url.searchParams.get('query')
    if (query) {
        const getSearchResults = async () =>
            fetch(`/api/search?query=${query}&userId=${locals.user.id}`, {})
                .then((response) => response.json() as Promise<{ searchResults: (Song | Album | Artist | Playlist)[] }>)
                .then((data) => data.searchResults)

        return { searchResults: getSearchResults() }
    }
}
