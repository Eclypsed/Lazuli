import type { RequestHandler } from '@sveltejs/kit'

// This endpoint exists to act as a proxy for images, bypassing any CORS or other issues
// that could arise from using images from another origin
export const GET: RequestHandler = async ({ url }) => {
    const imageUrl = url.searchParams.get('url')
    if (!imageUrl || !URL.canParse(imageUrl)) return new Response('Missing or invalid url parameter', { status: 400 })

    const MAX_TRIES = 3

    const fetchImage = async (): Promise<ArrayBuffer> => {
        let tryCount = 0
        while (tryCount < MAX_TRIES) {
            ++tryCount
            try {
                return await fetch(imageUrl).then((response) => response.arrayBuffer())
            } catch (error) {
                console.error(error)
                continue
            }
        }

        throw new Error('Exceed Max Retires')
    }

    return new Response(await fetchImage())
}
