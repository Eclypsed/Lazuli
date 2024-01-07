import ytdl from 'ytdl-core'

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
    const videoId = url.searchParams.get('videoId')
    if (!videoId) {
        return new Response('Requires videoId Query Parameter', { status: 400 })
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
    const info = await ytdl.getInfo(videoUrl)
    const videoFormat = ytdl.chooseFormat(info.formats, {
        filter: (format) => format.hasVideo && !format.isDashMPD && 'contentLength' in format,
        quality: 'highestvideo',
    })
    const audioFormat = ytdl.chooseFormat(info.formats, {
        filter: 'audioonly',
        quality: 'highestaudio',
    })

    const responseData = JSON.stringify({ video: videoFormat.url, audio: audioFormat.url })
    const responseHeaders = new Headers({
        'Content-Type': 'application/json',
    })

    return new Response(responseData, { headers: responseHeaders })
}
