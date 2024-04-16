import type { RequestHandler } from '@sveltejs/kit'

// This endpoint exists to act as a proxy for images, bypassing any CORS or other issues
// that could arise from using images from another origin
export const GET: RequestHandler = async ({ url }) => {
    const imageUrl = url.searchParams.get('url')
    if (!imageUrl || !URL.canParse(imageUrl)) return new Response('Missing or invalid url parameter', { status: 400 })

    const fetchImage = async (): Promise<Response> => {
        const MAX_TRIES = 3
        let tries = 0
        while (tries < MAX_TRIES) {
            ++tries
            const response = await fetch(imageUrl).catch((reason) => {
                console.error(`Image fetch to ${imageUrl} failed: ${reason}`)
                return null
            })
            if (!response || !response.ok) continue

            const contentType = response.headers.get('content-type')
            if (!contentType || !contentType.startsWith('image')) throw new Error(`Url ${imageUrl} does not link to an image`)

            return response
        }

        throw new Error('Exceed Max Retires')
    }

    return await fetchImage()
}
