import type { RequestHandler } from '@sveltejs/kit'

const MAX_YOUTUBE_THUMBNAIL_SCALAR_SIZE = 16383

// TODO: It is possible to get images through many paths in the jellyfin API. To add support for a path, add a regex for it
const jellyfinImagePathnames = [/^\/Items\/([0-9a-f]{32})\/Images\/(Primary|Art|Backdrop|Banner|Logo|Thumb|Disc|Box|Screenshot|Menu|Chapter|BoxRear|Profile)$/]

// * Notes for the future:
// Spotify does not appear to use query parameter to scale its iamges and instead scale them via slight variations in the URL:
//
// Demon's Jingles - 300x300 - https://i.scdn.co/image/ab67616d00001e0230d02cfb02d41c65f0259c49
// Red Heart       - 300x300 - https://i.scdn.co/image/ab67616d00001e02c1b377b71713519ac06d8025
// Demon's Jingles - 64x64   - https://i.scdn.co/image/ab67616d0000485130d02cfb02d41c65f0259c49
// Red Heart       - 64x64   - https://i.scdn.co/image/ab67616d00004851c1b377b71713519ac06d8025
//
// From what I can tell the first 7 of the 40 hex characters are always the same. The next five seem to be based on what kind of media
// the image is asscoiated with.
//
// Type | Song  | Artist |
// Code | d0000 | 10000  |
//
// Then there are four more characters which appear to be a size code. However size codes do no appear work across different media types.
//
// Size | 64x64 | 160x160 | 300x300 | 320x320 | 640x640 | 640x640 |
// Code | 4851  | f178    | 1e02    | 5174    | b273    | e5eb    |
// Type | Song  | Artist  | Song    | Artist  | Song    | Artist  |
//
// It's also worth noting that while I have been using the word 'Song' spotify doesn't actually appear to have unique images for songs and
// from what I can tell all Song images are actually just the image of the album the song is from. In the case of singles, those are really
// just 1-length albums as far as Spotify is concerned. So consider Songs and Albums the same when it comes to Spotify images
//
// Playlists are pretty interesting, here's a sample of a playlist image:
//
// J-Core Mix - 60x60 - https://mosaic.scdn.co/60/ab67616d00001e021ad3e724a80ccbd585df8ea6ab67616d00001e029056aaf4675ec39d04b38c6dab67616d00001e02b204764ed7641264c954afa4ab67616d00001e02c1b377b71713519ac06d8025
//
// There appear to be three sizes of playlist thumbnail  as well, 60x60, 300x300, and 640x640. However this time the dimension is embeded directly pathname.
// The much longer hex code in the pathname is actually just the four codes for the thumbnails that show up in the mosaic concatenated together using the 300x300 code for each.
// What's even cooler is this endpoint can generate them on the fly, meaning you just stick four hex strings in and it will generate the mosaic.
// You have to put in four though, two, three, and anything greater than four will simply return a bad request, and one will simply return the image you specified
// but at the size specfied in the image code. You can however use whatever image size code in the hex strings though and it will generate the mosaic using whaterver
// resolution passed, it just doesn't make any sense to use the 640x640 code since the grid is a 2x2 with a maximum resolution of 640x640 anyway, so just use 300x300.
//
// The only question I have left is, why? Between YouTube and Spotify I really question the API design of some of these multi-billion dollar companies.
// InnerTube API response are just abominable, who the fuck describes the structure of their UI by wrapping the actually useful data in layers of completely
// abstract objcts and arrays like it's fucking HTML. I should never have to traverse 20+ layers deep into nonsense objects like musicResponsiveListItemFlexColumnRenderer
// just to get a name. At least Spotify has a well designed and developer friendly API structure, but seriously, why do all of the size code nonsense. If you're not
// going to support formats like webm and only want to stick to static images, that's fine, but just make the path /image/{itemId} and then you can
// specify what size you need with a query parameter ?size=small|medium|large. That way if you ever do want to move to a model that can support dynamically generating images
// of a specific size with query params, your API is already partially the way there. I won't complain about the playlist image generator though, that's pretty cool.
// My only suggestions would be to get rid of the image code nonsense and just use the song/album ids and also make both the ids and size a query param, not part of the path.
// YouTube Music does support dynamically resizing images in the API which is nice, except for the fact that they do it in the stupidest fucking way I have ever seen.
// What the fuck is this: =w1000&h1000. Those are not what query params look like, why would you bother making this fake query param bullshit when what you are trying to do has
// been a standard part URLs since their inception. Also you pull your images from SIX DIFFERENT FUCKING ORIGINS, only four of which actually support image scaling.
// In both YouTube Music and Spotify none of these image endpoints are protected in any way, so why do you inist on pissing off me and probably your own developers with these asinine practices?
//
// It's not perfect, but compared to this bullshit, the Jellyfin API is really fucking good.

function modifyImageURL(imageURL: URL, options?: { maxWidth?: number; maxHeight?: number }): string | null {
    const maxWidth = options?.maxWidth
    const maxHeight = options?.maxHeight
    const baseURL = imageURL.origin.concat(imageURL.pathname)

    // * YouTube Check
    switch (imageURL.origin) {
        case 'https://i.ytimg.com':
        case 'https://www.gstatic.com':
            // These two origins correspond to images that can't have their size modified with search params, so we just return them at the default res
            return baseURL
        case 'https://lh3.googleusercontent.com':
        case 'https://yt3.googleusercontent.com':
        case 'https://yt3.ggpht.com':
        case 'https://music.youtube.com':
            const fakeQueryParams = []
            if (maxWidth) fakeQueryParams.push(`w${Math.min(maxWidth, MAX_YOUTUBE_THUMBNAIL_SCALAR_SIZE)}`)
            if (maxHeight) fakeQueryParams.push(`h${Math.min(maxHeight, MAX_YOUTUBE_THUMBNAIL_SCALAR_SIZE)}`)
            return fakeQueryParams.length > 0 ? baseURL.concat(`=${fakeQueryParams.join('-')}`) : baseURL
    }
    // * YouTube Check

    // * Jellyfin Check
    if (jellyfinImagePathnames.some((regex) => regex.test(imageURL.pathname))) {
        const imageParams = new URLSearchParams()
        if (maxWidth) imageParams.append('maxWidth', maxWidth.toString())
        if (maxHeight) imageParams.append('maxHeight', maxHeight.toString())
        return imageParams.size > 0 ? baseURL.concat(`?${imageParams.toString()}`) : baseURL
    }
    // * Jellyfin Check

    // * By this point the URL does not match any of the expected formats, so we return null
    return null
}

export const GET: RequestHandler = async ({ url }) => {
    const imageUrlString = url.searchParams.get('url')
    if (!imageUrlString || !URL.canParse(imageUrlString)) return new Response('Missing or invalid url parameter', { status: 400 })

    const maxWidthInput = Number(url.searchParams.get('maxWidth'))
    const maxHeightInput = Number(url.searchParams.get('maxHeight'))

    const maxWidth = !Number.isNaN(maxWidthInput) && maxWidthInput > 0 ? Math.ceil(maxWidthInput) : undefined
    const maxHeight = !Number.isNaN(maxHeightInput) && maxHeightInput > 0 ? Math.ceil(maxHeightInput) : undefined

    const imageURL = modifyImageURL(new URL(imageUrlString), { maxWidth, maxHeight })
    if (!imageURL) return new Response('Unrecognized external image url format: ' + imageUrlString, { status: 400 })

    for (let tries = 0; tries < 3; ++tries) {
        const response = await fetch(imageURL).catch(() => null)
        if (!response || !response.ok) continue

        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.startsWith('image')) return new Response(`Url ${imageUrlString} does not link to an image`, { status: 400 })

        return response
    }

    return new Response(`Failed to fetch image at ${imageURL}: Exceed Max Retires`, { status: 502 })
}
