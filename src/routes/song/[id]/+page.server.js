export async function load ({ params, fetch }) {
    const songId = params.id
    const response = await fetch(`/api/jellyfin/song?songId=${songId}`)
    const responseData = await response.json()

    return {
        id: songId,
        songData: responseData
    }
}
