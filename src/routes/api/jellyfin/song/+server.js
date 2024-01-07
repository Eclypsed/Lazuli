import { JellyfinUtils } from '$lib/utils'

/** @type {import('./$types').RequestHandler} */
export async function GET({ url, fetch }) {
    const songId = url.searchParams.get('songId')
    if (!artistId) {
        return new Response('Requires songId Query Parameter', { status: 400 })
    }

    const endpoint = JellyfinUtils.getItemsEnpt({ ids: songId, recursive: true })
    const response = await fetch(endpoint)
    const data = await response.json()    

    const responseData = JSON.stringify(data.Items[0])
    const responseHeaders = new Headers({
        'Content-Type': 'application/json',
    })

    return new Response(responseData, {headers: responseHeaders})
}
