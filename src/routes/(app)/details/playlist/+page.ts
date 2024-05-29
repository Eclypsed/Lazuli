import type { PageLoad } from './$types'

export const load: PageLoad = async ({ fetch, url }) => {
    const connectionId = url.searchParams.get('connection')
    const id = url.searchParams.get('id')

    async function getPlaylist() {
        const playlistResponse = (await fetch(`/api/connections/${connectionId}/playlist?id=${id}`, {
            credentials: 'include',
        }).then((response) => response.json())) as { playlist: Playlist }
        return playlistResponse.playlist
    }

    async function getPlaylistItems() {
        const itemsResponse = (await fetch(`/api/connections/${connectionId}/playlist/${id}/items`, {
            credentials: 'include',
        }).then((response) => response.json())) as { items: Song[] }
        return itemsResponse.items
    }

    return { playlistDetails: Promise.all([getPlaylist(), getPlaylistItems()]) }
}
