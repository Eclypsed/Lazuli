export async function load({ url }) {
    const { id, service } = Object.fromEntries(url.searchParams)

    return {
        artistId: id,
        connectionId: service,
    }
}
