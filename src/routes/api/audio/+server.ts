import type { RequestHandler } from '@sveltejs/kit'
import { buildConnection } from '$lib/server/api-helper'

export const GET: RequestHandler = async ({ url, request }) => {
    const connectionId = url.searchParams.get('connection')
    const id = url.searchParams.get('id')
    if (!(connectionId && id)) return new Response('Missing query parameter', { status: 400 })
    // Might want to re-evaluate how specific I make these ^ v error response messages
    const connection = await buildConnection(connectionId).catch(() => null)
    if (!connection) return new Response('Invalid connection id', { status: 400 })

    const audioRequestHeaders = new Headers({ range: request.headers.get('range') ?? 'bytes=0-' })

    const response = await connection
        .getAudioStream(id, audioRequestHeaders)
        // * Withing the .getAudioStream() method of connections, a TypeError should be thrown if the request was invalid (e.g. non-existent id)
        // * A standard Error should be thrown if the fetch to the service's server failed or the request returned invalid data
        .catch((error: TypeError | Error) => {
            if (error instanceof TypeError) return new Response('Bad Request', { status: 400 })
            return new Response('Failed to fetch valid audio stream', { status: 502 })
        })

    return response
}
