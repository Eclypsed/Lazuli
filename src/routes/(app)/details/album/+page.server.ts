import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ fetch, url }) => {
    const connectionId = url.searchParams.get('connection')
    const id = url.searchParams.get('id')

    const getAlbum = async () =>
        fetch(`/api/connections/${connectionId}/album?id=${id}`)
            .then((response) => response.json() as Promise<{ album: Album }>)
            .then((data) => data.album)

    const getAlbumItems = async () =>
        fetch(`/api/connections/${connectionId}/album/${id}/items`)
            .then((response) => response.json() as Promise<{ items: Song[] }>)
            .then((data) => data.items)

    return { albumDetails: Promise.all([getAlbum(), getAlbumItems()]) }
}
