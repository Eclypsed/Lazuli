import { SECRET_INTERNAL_API_KEY } from '$env/static/private'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ fetch, url }) => {
    const connectionId = url.searchParams.get('connection')
    const id = url.searchParams.get('id')

    async function getAlbum(): Promise<Album> {
        const albumResponse = (await fetch(`/api/connections/${connectionId}/album?id=${id}`, {
            headers: { apikey: SECRET_INTERNAL_API_KEY },
        }).then((response) => response.json())) as { album: Album }
        return albumResponse.album
    }

    async function getAlbumItems(): Promise<Song[]> {
        const itemsResponse = (await fetch(`/api/connections/${connectionId}/album/${id}/items`, {
            headers: { apikey: SECRET_INTERNAL_API_KEY },
        }).then((response) => response.json())) as { items: Song[] }
        return itemsResponse.items
    }

    return { albumDetails: Promise.all([getAlbum(), getAlbumItems()]) }
}
