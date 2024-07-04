import type { PageServerLoad } from '../$types'

export const load: PageServerLoad = async ({ fetch, url, locals }) => {
    const query = url.searchParams.get('query')
    if (query) {
        const getSearchResults = async () =>
            fetch(`/api/v1/search?query=${query}&userId=${locals.user.id}&types=song,album,artist,playlist`)
                .then((response) => response.json() as Promise<{ results: (Song | Album | Artist | Playlist)[] }>)
                .then((data) => data.results)

        return { searchResults: getSearchResults() }
    }
}
