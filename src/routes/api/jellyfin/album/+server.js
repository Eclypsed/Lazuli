import { JellyfinUtils } from '$lib/utils'

/** @type {import('./$types').RequestHandler} */
export async function GET({ url, fetch }) {
    const albumId = url.searchParams.get('albumId')
    if (!albumId) {
        return new Response('Requires albumId Query Parameter', { status: 400 })
    }

    const endpoint = JellyfinUtils.getItemsEnpt({ albumIds: albumId, recursive: true })
    const response = await fetch(endpoint)
    const data = await response.json()

    // This handles rare circumstances where a song is part of an album but is not meant to be included in the track list
    // Example: Xronial Xero (Laur Remix) - Is tagged with the album Xronial Xero, but was a bonus track and not included as part of the album's track list.
    const items = data.Items.filter((item) => 'IndexNumber' in item)

    // Idk if it's efficient, but this is a beautiful one liner that accomplishes 1. Checking whether or not there are multiple discs, 2. Sorting the Items
    // primarily by disc number, and secondarily by track number, and 3. Defaulting to just sorting by track number if the album is only one disc.
    items.sort((a, b) =>
        a?.ParentIndexNumber !== b?.ParentIndexNumber
            ? a.ParentIndexNumber - b.ParentIndexNumber
            : a.IndexNumber - b.IndexNumber
    )

    const albumData = {
        name: items[0].Album,
        id: albumId,
        artists: items[0].AlbumArtists,
        year: items[0].ProductionYear,
        discCount: Math.max(...items.map((x) => x?.ParentIndexNumber)),
        length: items
            .map((x) => x.RunTimeTicks)
            .reduce((accumulator, currentValue) => accumulator + currentValue),
    }

    const responseData = JSON.stringify({
        albumItems: items,
        albumData: albumData,
    })
    const responseHeaders = new Headers({
        'Content-Type': 'application/json',
    })

    return new Response(responseData, {headers: responseHeaders})
}
