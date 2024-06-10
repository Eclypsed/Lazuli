import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ fetch, locals }) => {
    const getLibraryAlbums = async () =>
        fetch(`/api/users/${locals.user.id}/library/albums`)
            .then((response) => response.json() as Promise<{ items: Album[] }>)
            .then((data) => data.items)
            .catch(() => ({ error: 'Failed to retrieve library albums' }))

    return { albums: getLibraryAlbums() }
}
