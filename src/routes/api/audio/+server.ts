import type { RequestHandler } from '@sveltejs/kit'
import { Connections } from '$lib/server/connections'

export const GET: RequestHandler = async ({ url }) => {
    const connectionId = url.searchParams.get('connection')
    const id = url.searchParams.get('id')
    if (!(connectionId && id)) return new Response('Missing query parameter', { status: 400 })

    const connection = Connections.getConnections([connectionId])[0]
    const stream = await connection.getAudioStream(id)

    if (!stream.body) throw new Error(`Audio fetch did not return valid ReadableStream (Connection: ${connection.id})`)

    const contentLength = stream.headers.get('Content-Length')
    if (!contentLength || isNaN(Number(contentLength))) throw new Error(`Audio fetch did not return valid Content-Length header (Connection: ${connection.id})`)

    const headers = new Headers({
        'Content-Range': `bytes 0-${Number(contentLength) - 1}/${contentLength}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': contentLength.toString(),
        'Content-Type': 'audio/webm',
    })

    return new Response(stream.body, { status: 206, headers })
}
