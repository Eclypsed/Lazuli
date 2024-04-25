import { PUBLIC_VERSION } from '$env/static/public'
import { MusicBrainzApi } from 'musicbrainz-api'

const mbApi = new MusicBrainzApi({
    appName: 'Lazuli',
    appVersion: PUBLIC_VERSION,
    appContactInfo: 'Ec1ypsed@proton.me',
})

export class MusicBrainz {
    static async searchAlbum(albumName: string, albumArtists?: string[]): Promise<MusicBrainz.ReleaseSearchResult | null> {
        const searchResulst = await mbApi.search('release', { query: albumName, limit: 10 })
        if (searchResulst.releases.length === 0) {
            console.log(JSON.stringify('Nothing returned for ' + albumName))
            return null
        }

        const bestMatch = searchResulst.releases.reduce((prev, current) => {
            if (prev.score === current.score) {
                return new Date(prev.date).getTime() > new Date(current.date).getTime() ? prev : current
            }
            return prev.score > current.score ? prev : current
        })

        // const trackCount = bestMatch.media.reduce(accum)
        // bestMatch.media.forEach((mediaItem) => (trackCount += mediaItem['track-count']))
        const artists = bestMatch['artist-credit']?.map((artist) => ({ id: artist.artist.id, name: artist.artist.name }))

        const { id, title, date } = bestMatch
        return { id, name: title, releaseDate: date, artists, trackCount: 0 }
    }
}

declare namespace MusicBrainz {
    type ReleaseSearchResult = {
        id: string
        name: string
        releaseDate: string
        artists?: {
            id: string
            name: string
        }[]
        trackCount: number
    }
}
