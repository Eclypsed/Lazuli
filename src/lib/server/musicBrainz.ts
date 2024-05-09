import { PUBLIC_VERSION } from '$env/static/public'
import { MusicBrainzApi } from 'musicbrainz-api'

const mbApi = new MusicBrainzApi({
    appName: 'Lazuli',
    appVersion: PUBLIC_VERSION,
    appContactInfo: 'Ec1ypsed@proton.me',
})

async function potentialAliasesFromNames(artistNames: string[]) {
    const luceneQuery = artistNames.join(' OR ')
    const artistsResponse = await mbApi.search('artist', { query: luceneQuery })

    const SCORE_THRESHOLD = 90
    const possibleArtists = artistsResponse.artists.filter((artist) => artist.score >= SCORE_THRESHOLD)
    const aliases = possibleArtists.flatMap((artist) => [artist.name].concat(artist.aliases?.filter((alias) => alias.primary !== null).map((alias) => alias.name) ?? []))
    return [...new Set(aliases)] // Removes any duplicates
}

export class MusicBrainz {
    static async searchRecording(songName: string, artistNames?: string[]) {
        const standardSearchResults = await mbApi.search('recording', { query: songName, limit: 5 })
        const SCORE_THRESHOLD = 90
        const bestResults = standardSearchResults.recordings.filter((recording) => recording.score >= SCORE_THRESHOLD)

        const artistAliases = artistNames ? await potentialAliasesFromNames(artistNames) : null
        const luceneQuery = artistAliases ? `"${songName}"`.concat(` AND (${artistAliases.map((alias) => `artist:"${alias}"`).join(' OR ')})`) : `"${songName}"`

        console.log(luceneQuery)

        const searchResults = await mbApi.search('recording', { query: luceneQuery, limit: 1 })
        if (searchResults.recordings.length === 0) {
            console.log('Nothing returned for ' + songName)
            return null
        }

        const topResult = searchResults.recordings[0]
        // const bestMatch = searchResults.recordings.reduce((prev, current) => (prev.score > current.score ? prev : current))
        console.log(JSON.stringify(topResult))
    }

    static async searchRelease(albumName: string, artistNames?: string[]): Promise<MusicBrainz.ReleaseSearchResult | null> {
        const searchResulst = await mbApi.search('release', { query: albumName, limit: 10 })
        if (searchResulst.releases.length === 0) {
            console.log(JSON.stringify('Nothing returned for ' + albumName))
            return null
        }

        const bestMatch = searchResulst.releases.reduce((prev, current) => {
            if (prev.score === current.score) return new Date(prev.date).getTime() > new Date(current.date).getTime() ? prev : current
            return prev.score > current.score ? prev : current
        })

        const { id, title, date } = bestMatch
        const trackCount = bestMatch.media.reduce((acummulator, current) => acummulator + current['track-count'], 0)
        const artists = bestMatch['artist-credit']?.map((artist) => ({ id: artist.artist.id, name: artist.artist.name }))

        return { id, name: title, releaseDate: date, artists, trackCount } satisfies MusicBrainz.ReleaseSearchResult
    }

    static async searchArtist(artistName: string) {
        const searchResults = await mbApi.search('artist', { query: artistName })
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
