import type { RequestHandler } from '@sveltejs/kit'
import { Connections } from '$lib/server/connections'
import ytdl from 'ytdl-core'

export const GET: RequestHandler = async ({ url, request }) => {
    const connectionId = url.searchParams.get('connectionId')
    const id = url.searchParams.get('id')
    if (!(connectionId && id)) return new Response('Missing query parameter', { status: 400 })
    const range = request.headers.get('range')
    if (!range) return new Response('Missing Range Header')

    const videourl = `http://www.youtube.com/watch?v=${id}`

    const videoInfo = await ytdl.getInfo(videourl)
    const format = ytdl.chooseFormat(videoInfo.formats, { quality: 'highestaudio', filter: 'audioonly' })

    const audioSize = format.contentLength
    const CHUNK_SIZE = 5 * 10 ** 6
    const start = Number(range.replace(/\D/g, ''))
    const end = Math.min(start + CHUNK_SIZE, Number(audioSize) - 1)
    const contentLength = end - start + 1

    const headers = new Headers({
        'Content-Range': `bytes ${start}-${end}/${audioSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': contentLength.toString(),
        'Content-Type': 'audio/webm',
    })

    const partialStream = ytdl(videourl, { format, range: { start, end } })

    // @ts-ignore IDK enough about streaming to understand what the problem is here
    // but it appears that ytdl has a custom version of a readable stream type they use internally
    // and is what gets returned by ytdl(). Svelte will only allow you to send back the type ReadableStream
    // so it ts gets mad if you try to send back their internal type.
    // IDK to me a custom readable type seems incredibly stupid but what do I know?
    // Currently haven't found a way to convert their readable to ReadableStream type, casting doesn't seem to work either.
    return new Response(partialStream, { status: 206, headers })
}
