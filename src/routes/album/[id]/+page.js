import { generateURL } from '$lib/Jellyfin-api.js'

export async function load({ fetch, params }) {
    const response = await fetch(
        generateURL({
            type: 'Items',
            queryParams: { albumIds: params.id, recursive: true },
        })
    )
    const albumItemsData = await response.json()

    // This handles rare circumstances where a song is part of an album but is not meant to be included in the track list
    // Example: Xronial Xero (Laur Remix) - Is tagged with the album Xronial Xero, but was a bonus track and not included as part of the album's track list.
    const items = albumItemsData.Items.filter((item) => 'IndexNumber' in item)

    // Idk if it's efficient, but this is a beautiful one liner that accomplishes 1. Checking whether or not there are multiple discs, 2. Sorting the Items
    // primarily by disc number, and secondarily by track number, and 3. Defaulting to just sorting by track number if the album is only one disc.
    items.sort((a, b) =>
        a?.ParentIndexNumber !== b?.ParentIndexNumber
            ? a.ParentIndexNumber - b.ParentIndexNumber
            : a.IndexNumber - b.IndexNumber
    )

    const albumData = {
        name: items[0].Album,
        id: items[0].AlbumId,
        artists: items[0].AlbumArtists,
        year: items[0].ProductionYear,
        discCount: Math.max(...items.map((x) => x?.ParentIndexNumber)),
        length: items
            .map((x) => x.RunTimeTicks)
            .reduce((accumulator, currentValue) => accumulator + currentValue),
    }

    return {
        id: params.id,
        albumItemsData: items,
        albumData: albumData,
    }
}
