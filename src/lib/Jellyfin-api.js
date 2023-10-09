export const ROOT_URL = 'http://eclypsecloud:8096/'
export const API_KEY = 'fd4bf4c18e5f4bb08c2cb9f6a1542118'
export const USER_ID = '7364ce5928c64b90b5765e56ca884053'

const baseURLGenerator = {
    Items: () => `Users/${USER_ID}/Items`,
    Image: (params) => `Items/${params.id}/Images/Primary`,
    Audio: (params) => `Audio/${params.id}/universal`,
}

export const generateURL = ({ type, pathParams, queryParams }) => {
    const baseURLFunction = baseURLGenerator[type]

    if (baseURLFunction) {
        const baseURL = ROOT_URL.concat(baseURLFunction(pathParams))
        const queryParamList = queryParams ? Object.entries(queryParams).map(([key, value]) => `${key}=${value}`) : []
        queryParamList.push(`api_key=${API_KEY}`)

        return baseURL.concat('?' + queryParamList.join('&'))
    } else {
        throw new Error('API Url Type does not exist')
    }
}

export const fetchArtistItems = async (artistId) => {
    try {
        const response = await fetch(
            generateURL({
                type: 'Items',
                queryParams: { artistIds: artistId, recursive: true },
            }),
        )
        const data = await response.json()

        const artistItems = {
            albums: [],
            singles: [],
            appearances: [],
        }

        // Filters the raw list of items to only the albums that were produced in fully or in part by the specified artist
        artistItems.albums = data.Items.filter((item) => item.Type === 'MusicAlbum' && item.AlbumArtists.some((artist) => artist.Id === artistId))

        data.Items.forEach((item) => {
            if (item.Type === 'Audio') {
                if (!('AlbumId' in item)) {
                    artistItems.singles.push(item)
                } else if (!artistItems.albums.some((album) => album.Id === item.AlbumId)) {
                    artistItems.appearances.push(item)
                }
            }
        })

        return artistItems
    } catch (error) {
        console.log('Error Fetching Artist Items:', error)
    }
}

export const fetchSong = async (songId) => {
    try {
        const response = await fetch(
            generateURL({
                type: 'Items',
                queryParams: { ids: songId, recursive: true },
            }),
        )
        const data = await response.json()

        return data.Items[0]
    } catch (error) {
        console.log('Error Fetch Song', error)
    }
}
