export async function load({ params, fetch }) {
    const artistId = params.id
    const response = await fetch(`/api/jellyfin/artist?artistId=${artistId}`)
    const responseData = await response.json()

    return {
        id: artistId,
        artistItems: responseData,
    }
}
