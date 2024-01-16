export async function load({ fetch, params }) {
    const albumId = params.id
    const response = await fetch(`/api/jellyfin/album?albumId=${albumId}`)
    const responseData = await response.json()

    return {
        id: albumId,
        albumItemsData: responseData.albumItems,
        albumData: responseData.albumData,
    }
}
