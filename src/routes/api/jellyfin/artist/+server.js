import { JellyfinUtils } from '$lib/utils'

/** @type {import('./$types').RequestHandler} */
export async function GET({ url, fetch }) {
    const artistId = url.searchParams.get('artistId')
    if (!artistId) {
        return new Response('Requires artistId Query Parameter', { status: 400 })
    }

    const endpoint = JellyfinUtils.getItemsEnpt({ artistIds: artistId, recursive: true })
    const response = await fetch(endpoint)
    const data = await response.json()

    const artistItems = {
        albums: [],
        singles: [],
        appearances: [],
    }

    // Filters the raw list of items to only the albums that were produced fully or in part by the specified artist
    artistItems.albums = data.Items.filter((item) => item.Type === 'MusicAlbum' && item.AlbumArtists.some((artist) => artist.Id === artistId))

    data.Items.forEach((item) => {
        if (item.Type === 'Audio') {
            if (!('AlbumId' in item)) {
                artistItems.singles.push(item)
            } else if (!artistItems.albums.some((album) => album.Id === item.AlbumId)) {
                artistItems.appearances.push(item)
            }
        }
    })

    const responseData = JSON.stringify(artistItems)
    const responseHeaders = new Headers({
        'Content-Type': 'application/json',
    })

    return new Response(responseData, { headers: responseHeaders })
}
