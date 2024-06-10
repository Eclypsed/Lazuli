import type { RequestHandler } from '@sveltejs/kit'

const MAX_YOUTUBE_THUMBNAIL_SCALAR_SIZE = 16383

// TODO: It is possible to get images through many paths in the jellyfin API. To add support for a path, add a regex for it
const jellyfinImagePathnames = [/^\/Items\/([0-9a-f]{32})\/Images\/(Primary|Art|Backdrop|Banner|Logo|Thumb|Disc|Box|Screenshot|Menu|Chapter|BoxRear|Profile)$/]

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
