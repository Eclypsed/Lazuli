/** @type {import('./$types').PageServerLoad} */
export async function load({ url, fetch }) {
    const videoId = url.searchParams.get('videoId')
    const response = await fetch(`/api/yt/media?videoId=${videoId}`)
    const responseData = await response.json()
    return {
        videoId: videoId,
        videoUrl: responseData.video,
        audioUrl: responseData.audio,
    }
}
