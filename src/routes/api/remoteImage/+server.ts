import type { RequestHandler } from '@sveltejs/kit'

export const GET: RequestHandler = async ({ url }) => {
    // const connectionId = url.searchParams.get('connection')
    // const id = url.searchParams.get('id')
    // if (!(connectionId && id)) return new Response('Missing query parameter', { status: 400 })
    const imageUrl = url.searchParams.get('url')
    if (!imageUrl) return new Response('Missing url', { status: 400 })

    const image = await fetch(imageUrl).then((response) => response.arrayBuffer())

    return new Response(image)
}
