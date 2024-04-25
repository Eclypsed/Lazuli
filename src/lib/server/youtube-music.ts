import { google, type youtube_v3 } from 'googleapis'
import ytdl from 'ytdl-core'
import { DB } from './db'
import { PUBLIC_YOUTUBE_API_CLIENT_ID } from '$env/static/public'
import { YOUTUBE_API_CLIENT_SECRET } from '$env/static/private'
import { MusicBrainz } from './musicBrainz'

export class YouTubeMusic implements Connection {
    public readonly id: string
    private readonly userId: string
    private readonly ytUserId: string
    private currentAccessToken: string
    private readonly refreshToken: string
    private expiry: number

    constructor(id: string, userId: string, youtubeUserId: string, accessToken: string, refreshToken: string, expiry: number) {
        this.id = id
        this.userId = userId
        this.ytUserId = youtubeUserId
        this.currentAccessToken = accessToken
        this.refreshToken = refreshToken
        this.expiry = expiry
    }

    private get innertubeRequestHeaders() {
        return (async () => {
            return new Headers({
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0',
                accept: '*/*',
                'accept-encoding': 'gzip, deflate',
                'content-type': 'application/json',
                'content-encoding': 'gzip',
                origin: 'https://music.youtube.com',
                Cookie: 'SOCS=CAI;',
                authorization: `Bearer ${await this.accessToken}`,
                'X-Goog-Request-Time': `${Date.now()}`,
            })
        })()
    }

    private get accessToken(): Promise<string> {
        return (async () => {
            const refreshTokens = async (): Promise<{ accessToken: string; expiry: number }> => {
                const MAX_TRIES = 3
                let tries = 0
                const refreshDetails = { client_id: PUBLIC_YOUTUBE_API_CLIENT_ID, client_secret: YOUTUBE_API_CLIENT_SECRET, refresh_token: this.refreshToken, grant_type: 'refresh_token' }

                while (tries < MAX_TRIES) {
                    ++tries
                    const response = await fetch('https://oauth2.googleapis.com/token', {
                        method: 'POST',
                        body: JSON.stringify(refreshDetails),
                    }).catch((reason) => {
                        console.error(`Fetch to refresh endpoint failed: ${reason}`)
                        return null
                    })
                    if (!response || !response.ok) continue

                    const { access_token, expires_in } = await response.json()
                    const expiry = Date.now() + expires_in * 1000
                    return { accessToken: access_token, expiry }
                }

                throw new Error(`Failed to refresh access tokens for YouTube Music connection: ${this.id}`)
            }

            if (this.expiry < Date.now()) {
                const { accessToken, expiry } = await refreshTokens()
                DB.updateTokens(this.id, { accessToken, refreshToken: this.refreshToken, expiry })
                this.currentAccessToken = accessToken
                this.expiry = expiry
            }

            return this.currentAccessToken
        })()
    }

    public async getConnectionInfo(): Promise<Extract<ConnectionInfo, { type: 'youtube-music' }>> {
        const youtube = google.youtube('v3')
        const access_token = await this.accessToken.catch(() => {
            return null
        })

        let username, profilePicture
        if (access_token) {
            const userChannelResponse = await youtube.channels.list({ mine: true, part: ['snippet'], access_token })
            const userChannel = userChannelResponse?.data.items?.[0]
            username = userChannel?.snippet?.title ?? undefined // ?? undefined will simply ensure that if it is null it get's converted to undefined
            profilePicture = userChannel?.snippet?.thumbnails?.default?.url ?? undefined
        }

        return { id: this.id, userId: this.userId, type: 'youtube-music', youtubeUserId: this.ytUserId, username, profilePicture }
    }

    public async search(searchTerm: string, filter?: 'song' | 'album' | 'artist' | 'playlist'): Promise<(Song | Album | Artist | Playlist)[]> {
        // Figure out how to handle Library and Uploads
        // Depending on how I want to handle the playlist & library sync feature

        const searchParams = {
            song: 'EgWKAQIIAWoMEA4QChADEAQQCRAF',
            album: 'EgWKAQIYAWoMEA4QChADEAQQCRAF',
            artist: 'EgWKAQIgAWoMEA4QChADEAQQCRAF',
            playlist: 'Eg-KAQwIABAAGAAgACgBMABqChAEEAMQCRAFEAo%3D',
        }

        const searchResulsts: InnerTube.SearchResponse = await fetch(`https://music.youtube.com/youtubei/v1/search`, {
            headers: await this.innertubeRequestHeaders,
            method: 'POST',
            body: JSON.stringify({
                query: searchTerm,
                params: filter ? searchParams[filter] : undefined,
                context: {
                    client: {
                        clientName: 'WEB_REMIX',
                        clientVersion: `1.${formatDate()}.01.00`,
                        hl: 'en',
                    },
                },
            }),
        }).then((response) => response.json())

        const contents = searchResulsts.contents.tabbedSearchResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents

        const parsedSearchResults: (Song | Album | Artist | Playlist)[] = []
        const goodSections = ['Songs', 'Videos', 'Albums', 'Artists', 'Community playlists']
        for (const section of contents) {
            if ('musicCardShelfRenderer' in section) {
                parsedSearchResults.push(parseMusicCardShelfRenderer(this.id, section.musicCardShelfRenderer))
                section.musicCardShelfRenderer.contents?.forEach((item) => {
                    if ('musicResponsiveListItemRenderer' in item) {
                        parsedSearchResults.push(parseResponsiveListItemRenderer(this.id, item.musicResponsiveListItemRenderer))
                    }
                })
                continue
            }

            const sectionType = section.musicShelfRenderer.title.runs[0].text
            if (!goodSections.includes(sectionType)) continue

            const parsedSectionContents = section.musicShelfRenderer.contents.map((item) => parseResponsiveListItemRenderer(this.id, item.musicResponsiveListItemRenderer))
            parsedSearchResults.push(...parsedSectionContents)
        }

        return parsedSearchResults
    }

    public async getRecommendations(): Promise<(Song | Album | Artist | Playlist)[]> {
        const homeResponse: InnerTube.HomeResponse = await fetch(`https://music.youtube.com/youtubei/v1/browse`, {
            headers: await this.innertubeRequestHeaders,
            method: 'POST',
            body: JSON.stringify({
                browseId: 'FEmusic_home',
                context: {
                    client: {
                        clientName: 'WEB_REMIX',
                        clientVersion: `1.${formatDate()}.01.00`,
                        hl: 'en',
                    },
                },
            }),
        }).then((response) => response.json())

        const contents = homeResponse.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents

        const albums = [
            'AD:Trance 10',
            'Hardcore Syndrome 3',
            'Nanosecond Eternity',
            'Social Outcast',
            'Kathastrophe',
            'Reverse Clock',
            'SPEED BALL GT',
            'HYPER FULL THROTTLE',
            'IRREPARABLE HARDCORE IS BACK 2',
            'Cruel Wounds',
        ]
        albums.forEach((album) => MusicBrainz.searchAlbum(album))

        return []

        const recommendations: (Song | Album | Artist | Playlist)[] = []
        const goodSections = ['Listen again', 'Forgotten favorites', 'Quick picks', 'From your library']
        for (const section of contents) {
            const sectionType = section.musicCarouselShelfRenderer.header.musicCarouselShelfBasicHeaderRenderer.title.runs[0].text
            if (!goodSections.includes(sectionType)) continue

            const parsedContent = section.musicCarouselShelfRenderer.contents.map((content) =>
                'musicTwoRowItemRenderer' in content ? parseTwoRowItemRenderer(this.id, content.musicTwoRowItemRenderer) : parseResponsiveListItemRenderer(this.id, content.musicResponsiveListItemRenderer),
            )
            recommendations.push(...parsedContent)
        }

        const songs = recommendations.filter((recommendation) => recommendation.type === 'song') as Song[]
        const scrapedSong = songs.map((song) => {
            return { id: song.id, name: song.name, type: 'song', isVideo: false } satisfies ScrapedSong
        })

        this.buildFullSongProfiles(scrapedSong)

        return recommendations
    }

    public async getAudioStream(id: string, range: string | null): Promise<Response> {
        const videoInfo = await ytdl.getInfo(`http://www.youtube.com/watch?v=${id}`)
        const format = ytdl.chooseFormat(videoInfo.formats, { quality: 'highestaudio', filter: 'audioonly' })

        const headers = new Headers({ range: range || '0-' })

        return await fetch(format.url, { headers })
    }

    public async getAlbum(id: string): Promise<ScrapedAlbum> {
        const albumResponse: InnerTube.AlbumResponse = await fetch(`https://music.youtube.com/youtubei/v1/browse`, {
            headers: await this.innertubeRequestHeaders,
            method: 'POST',
            body: JSON.stringify({
                browseId: id,
                context: {
                    client: {
                        clientName: 'WEB_REMIX',
                        clientVersion: `1.${formatDate()}.01.00`,
                        hl: 'en',
                    },
                },
            }),
        }).then((response) => response.json())

        const header = albumResponse.header.musicDetailHeaderRenderer
        const contents = albumResponse.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].musicShelfRenderer.contents
    }

    public async getArtist(id: string): Promise<ScrapedArtist> {}

    public async getUser(id: string): Promise<ScrapedUser> {}

    private async buildFullSongProfiles(scrapedSongs: ScrapedSong[]): Promise<Song[]> {
        const connection = { id: this.id, type: 'youtube-music' } satisfies Song['connection']

        const songIds = new Set<string>(),
            albumIds = new Set<string>(),
            artistIds = new Set<string>(),
            userIds = new Set<string>()

        scrapedSongs.forEach((song) => {
            songIds.add(song.id)
            if (song.album?.id) {
                albumIds.add(song.album.id)
            }
            song.artists.forEach((artist) => artistIds.add(artist.id))
            if (song.uploader) {
                userIds.add(song.uploader.id)
            }
        })

        const getSongDetails = async () => google.youtube('v3').videos.list({ part: ['snippet', 'contentDetails'], id: Array.from(songIds), access_token: await this.accessToken })
        const getAlbumDetails = () => Promise.all(Array.from(albumIds).map((id) => this.getAlbum(id)))
        const getArtistDetails = () => Promise.all(Array.from(artistIds).map((id) => this.getArtist(id)))
        const getUserDetails = () => Promise.all(Array.from(userIds).map((id) => this.getUser(id)))

        const [songDetails, albumDetails, artistDetails, userDetails] = await Promise.all([getSongDetails(), getAlbumDetails(), getArtistDetails(), getUserDetails()])
        const songDetailsMap = new Map<string, youtube_v3.Schema$Video>(),
            albumDetailsMap = new Map<string, ScrapedAlbum>(),
            artistDetailsMap = new Map<string, ScrapedArtist>(),
            userDetailsMap = new Map<string, ScrapedUser>()
        songDetails.data.items!.forEach((item) => songDetailsMap.set(item.id!, item))
        albumDetails.forEach((album) => albumDetailsMap.set(album.id, album))
        artistDetails.forEach((artist) => artistDetailsMap.set(artist.id, artist))
        userDetails.forEach((user) => userDetailsMap.set(user.id, user))

        return scrapedSongs.map((song) => {
            const songDetails = songDetailsMap.get(song.id)!
            const duration = secondsFromISO8601(songDetails.contentDetails?.duration!)

            const thumbnails = songDetails.snippet?.thumbnails!
            const thumbnailUrl = song.thumbnailUrl ?? thumbnails.maxres?.url ?? thumbnails.standard?.url ?? thumbnails.high?.url ?? thumbnails.medium?.url ?? thumbnails.default?.url!

            let album: Song['album'],
                uploader: Song['uploader'],
                releaseDate = new Date(songDetails.snippet?.publishedAt!).toLocaleDateString()

            const artists: Song['artists'] = song.artists.map((artist) => {
                const { id, name, profilePicture } = artistDetailsMap.get(artist.id)!
                return { id, name, profilePicture }
            })
            if (song.album) {
                const { id, name, thumbnailUrl, releaseYear } = albumDetailsMap.get(song.album.id)!
                album = { id, name, thumbnailUrl }
                releaseDate = releaseYear
            }
            if (song.uploader) {
                const { id, name, profilePicture } = userDetailsMap.get(song.uploader.id)!
                uploader = { id, name, profilePicture }
            }

            return { connection, id: song.id, name: song.name, type: 'song', duration, thumbnailUrl, artists, album, isVideo: song.isVideo, uploader, releaseDate }
        })
    }
}

function parseTwoRowItemRenderer(rowContent: InnerTube.musicTwoRowItemRenderer): ScrapedSong | ScrapedAlbum | ScrapedArtist | ScrapedPlaylist {
    const name = rowContent.title.runs[0].text

    if ('watchEndpoint' in rowContent.navigationEndpoint) {
        let album: ScrapedSong['album'],
            artists: ScrapedSong['artists'] = [],
            uploader: ScrapedSong['uploader']
        rowContent.menu.menuRenderer.items.forEach((menuOption) => {
            if (
                'menuNavigationItemRenderer' in menuOption &&
                'browseEndpoint' in menuOption.menuNavigationItemRenderer.navigationEndpoint &&
                menuOption.menuNavigationItemRenderer.navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType === 'MUSIC_PAGE_TYPE_ALBUM'
            ) {
                album = { id: menuOption.menuNavigationItemRenderer.navigationEndpoint.browseEndpoint.browseId }
            }
        })
        rowContent.subtitle.runs.forEach((run) => {
            if (!run.navigationEndpoint) return

            const pageType = run.navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType
            const runData = { id: run.navigationEndpoint.browseEndpoint.browseId, name: run.text }
            if (pageType === 'MUSIC_PAGE_TYPE_ARTIST') {
                artists.push(runData)
            } else if (pageType === 'MUSIC_PAGE_TYPE_USER_CHANNEL') {
                uploader = runData
            }
        })

        const isUserUploaded = rowContent.navigationEndpoint.watchEndpoint.watchEndpointMusicSupportedConfigs.watchEndpointMusicConfig.musicVideoType === 'MUSIC_VIDEO_TYPE_UGC'
        const thumbnailUrl: ScrapedSong['thumbnailUrl'] = isUserUploaded ? undefined : refineThumbnailUrl(rowContent.thumbnailRenderer.musicThumbnailRenderer.thumbnail.thumbnails[0].url)

        const id = rowContent.navigationEndpoint.watchEndpoint.videoId
        return { id, name, type: 'song', thumbnailUrl, album, artists, uploader, isVideo: isUserUploaded } satisfies ScrapedSong
    }

    const pageType = rowContent.navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType
    rowContent.menu.menuRenderer.items.forEach((menuItem) => {
        if ('menuServiceItemRenderer' in menuItem) {
            const queueTarget = menuItem.menuServiceItemRenderer.serviceEndpoint.queueAddEndpoint.queueTarget
            if ('playlistId' in queueTarget) {
                const thumbnailUrl = refineThumbnailUrl(rowContent.thumbnailRenderer.musicThumbnailRenderer.thumbnail.thumbnails[0].url)
                if (pageType === 'MUSIC_PAGE_TYPE_ALBUM') {
                    const album = { id: queueTarget.playlistId, name, type: 'album', thumbnailUrl } satisfies ScrapedAlbum
                }
            }
        }
    })

    const id = rowContent.navigationEndpoint.browseEndpoint.browseId
    const thumbnailUrl = refineThumbnailUrl(rowContent.thumbnailRenderer.musicThumbnailRenderer.thumbnail.thumbnails[0].url)
    switch (pageType) {
        case 'MUSIC_PAGE_TYPE_ALBUM':
            return { id, name, type: 'album', artists, thumbnailUrl } satisfies ScrapedAlbum
        case 'MUSIC_PAGE_TYPE_ARTIST':
        case 'MUSIC_PAGE_TYPE_USER_CHANNEL':
            return { id, name, type: 'artist', profilePicture: thumbnailUrl } satisfies ScrapedArtist
        case 'MUSIC_PAGE_TYPE_PLAYLIST':
            return { id, name, type: 'playlist', createdBy, thumbnailUrl } satisfies ScrapedPlaylist
    }
}

function parseResponsiveListItemRenderer(connection: string, listContent: InnerTube.musicResponsiveListItemRenderer): Song | Album | Artist | Playlist {
    const name = listContent.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].text
    const thumbnail = refineThumbnailUrl(listContent.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails[0].url)

    let artists: (Song | Album)['artists'], createdBy: (Song | Playlist)['createdBy']
    for (const run of listContent.flexColumns[1].musicResponsiveListItemFlexColumnRenderer.text.runs) {
        if (!run.navigationEndpoint) continue

        const pageType = run.navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType
        if (pageType === 'MUSIC_PAGE_TYPE_ARTIST') {
            const artist = { id: run.navigationEndpoint.browseEndpoint.browseId, name: run.text }
            artists ? artists.push(artist) : (artists = [artist])
        } else if (pageType === 'MUSIC_PAGE_TYPE_USER_CHANNEL') {
            createdBy = { id: run.navigationEndpoint.browseEndpoint.browseId, name: run.text }
        }
    }

    if (!('navigationEndpoint' in listContent)) {
        const id = listContent.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].navigationEndpoint.watchEndpoint.videoId
        const column2run = listContent.flexColumns[2]?.musicResponsiveListItemFlexColumnRenderer.text.runs?.[0]
        let album: Song['album']
        if (column2run?.navigationEndpoint?.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType === 'MUSIC_PAGE_TYPE_ALBUM') {
            album = { id: column2run.navigationEndpoint.browseEndpoint.browseId, name: column2run.text }
        }

        return { connection, id, name, type: 'song', artists, album, createdBy, thumbnail } satisfies Song
    }

    const id = listContent.navigationEndpoint.browseEndpoint.browseId
    const pageType = listContent.navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType
    switch (pageType) {
        case 'MUSIC_PAGE_TYPE_ALBUM':
            return { connection, id, name, type: 'album', artists, thumbnail } satisfies Album
        case 'MUSIC_PAGE_TYPE_ARTIST':
        case 'MUSIC_PAGE_TYPE_USER_CHANNEL':
            return { connection, id, name, type: 'artist', thumbnail } satisfies Artist
        case 'MUSIC_PAGE_TYPE_PLAYLIST':
            return { connection, id, name, type: 'playlist', createdBy, thumbnail } satisfies Playlist
    }
}

function parseMusicCardShelfRenderer(connection: string, cardContent: InnerTube.musicCardShelfRenderer): Song | Album | Artist | Playlist {
    const name = cardContent.title.runs[0].text
    const thumbnail = refineThumbnailUrl(cardContent.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails[0].url)

    let album: Song['album'], artists: (Song | Album)['artists'], createdBy: (Song | Playlist)['createdBy']
    for (const run of cardContent.subtitle.runs) {
        if (!run.navigationEndpoint) continue

        const pageType = run.navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType
        if (pageType === 'MUSIC_PAGE_TYPE_ALBUM') {
            album = { id: run.navigationEndpoint.browseEndpoint.browseId, name: run.text }
        } else if (pageType === 'MUSIC_PAGE_TYPE_ARTIST') {
            const artist = { id: run.navigationEndpoint.browseEndpoint.browseId, name: run.text }
            artists ? artists.push(artist) : (artists = [artist])
        } else if (pageType === 'MUSIC_PAGE_TYPE_USER_CHANNEL') {
            createdBy = { id: run.navigationEndpoint.browseEndpoint.browseId, name: run.text }
        }
    }

    const navigationEndpoint = cardContent.title.runs[0].navigationEndpoint
    if ('watchEndpoint' in navigationEndpoint) {
        const id = navigationEndpoint.watchEndpoint.videoId
        return { connection, id, name, type: 'song', artists, album, createdBy, thumbnail } satisfies Song
    }

    const pageType = navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType
    const id = navigationEndpoint.browseEndpoint.browseId
    switch (pageType) {
        case 'MUSIC_PAGE_TYPE_ALBUM':
            return { connection, id, name, type: 'album', artists, thumbnail } satisfies Album
        case 'MUSIC_PAGE_TYPE_ARTIST':
        case 'MUSIC_PAGE_TYPE_USER_CHANNEL':
            return { connection, id, name, type: 'artist', thumbnail } satisfies Artist
        case 'MUSIC_PAGE_TYPE_PLAYLIST':
            return { connection, id, name, type: 'playlist', createdBy, thumbnail } satisfies Playlist
    }
}

/** YouTube should (I haven't confirmed) cap duration scaling at days, so any duration will be in the following ISO8601 Format: PnDTnHnMnS */
function secondsFromISO8601(duration: string): number {
    const iso8601DurationRegex = /P(?:([.,\d]+)D)?T(?:([.,\d]+)H)?(?:([.,\d]+)M)?(?:([.,\d]+)S)?/ // Credit: https://stackoverflow.com/users/1195273/crush
    const result = iso8601DurationRegex.exec(duration)
    const days = result?.[1] ?? 0,
        hours = result?.[2] ?? 0,
        minutes = result?.[3] ?? 0,
        seconds = result?.[4] ?? 0
    return Number(seconds) + Number(minutes) * 60 + Number(hours) * 3600 + Number(days) * 86400
}

/** Remove YouTubes fake query parameters from their thumbnail urls returning the base url for as needed modification.
 * Valid URL origins:
 * - https://lh3.googleusercontent.com
 * - https://yt3.googleusercontent.com
 * - https://yt3.ggpht.com
 * - https://music.youtube.com
 */
function refineThumbnailUrl(urlString: string): string {
    if (!URL.canParse(urlString)) throw new Error('Invalid thumbnail url')

    switch (new URL(urlString).origin) {
        case 'https://lh3.googleusercontent.com':
        case 'https://yt3.googleusercontent.com':
        case 'https://yt3.ggpht.com':
            return urlString.slice(0, urlString.indexOf('='))
        case 'https://music.youtube.com':
            return urlString
        default: // 'https://i.ytimg.com' cannot be manimulated with query params and as such is invalid
            console.error(urlString)
            throw new Error('Invalid thumbnail url origin')
    }
}

function formatDate(): string {
    const currentDate = new Date()
    const year = currentDate.getUTCFullYear()
    const month = (currentDate.getUTCMonth() + 1).toString().padStart(2, '0') // Months are zero-based, so add 1
    const day = currentDate.getUTCDate().toString().padStart(2, '0')

    return year + month + day
}

// NOTE 1: Thumbnails
// When scraping thumbnails from the YTMusic browse pages, there are two different types of images that can be returned,
// standard video thumbnais and auto-generated square thumbnails for propper releases. The auto-generated thumbanils we want to
// keep from the scrape because:
// a) They can be easily scaled with ytmusic's weird fake query parameters (Ex: https://baseUrl=w1000&h1000)
// b) When fetched from the youtube data api it returns the 16:9 filled thumbnails like you would see in the standard yt player, we want the squares
//
// However when the thumbnail is for a video, we want to ignore it because the highest quality thumbnail will rarely be used in the ytmusic webapp
// and there is no easy way scale them due to the fixed sizes (default, medium, high, standard, maxres) without any way to determine if a higher quality exists.
// Therefor, these thumbanils should be fetched from the youtube data api and the highest res should be chosen. In the remoteImage endpoint this high res can
// be scaled to the desired resolution with image processing.
//
// NOTE 2: browseIds vs playlistIds
// The browseId for a playlist is just "VL" + playlistId. The browseId will get you the playlist page, the playlistId is what appears as a query parameter
// in the url and what you would use with the youtube data api to get data about the playlist. For this reason, for the id parameter of the playlist type
// for ytmusic playlists, use the playlistId and not the browseId. The browseId can be generated as needed.
//
// However for albums use the browseId because you need it to query the v1 ytmusic api, and there is no way to get that from the playlistId. Additionally
// we don't really need the album's playlistId because the official youtube data API is so useless it doesn't provide anything of value that can't
// also be scraped from the browseId response.

type ScrapedSong = {
    id: string
    name: string
    type: 'song'
    thumbnailUrl: string
    artists: {
        id: string
        name?: string
    }[]
    album?: {
        id: string
        name?: string
    }
    uploader?: {
        id: string
        name?: string
    }
    isVideo: boolean
}

type ScrapedAlbum = {
    id: string
    name: string
    type: 'album'
    thumbnailUrl: string
    artists:
        | {
              id: string
              name?: string
          }[]
        | 'Various Artists'
    releaseYear?: string
    length?: number
}

type ScrapedArtist = {
    id: string
    name: string
    type: 'artist'
    profilePicture?: string
}

type ScrapedPlaylist = {
    id: string
    name: string
    type: 'playlist'
    thumbnailUrl: string
    createdBy?: {
        id: string
        name?: string
    }
}

type ScrapedUser = {
    id: string
    name: string
    type: 'user'
    profilePicture?: string
}

declare namespace InnerTube {
    interface AlbumResponse {
        contents: {
            singleColumnBrowseResultsRenderer: {
                tabs: [
                    {
                        tabRenderer: {
                            content: {
                                sectionListRenderer: {
                                    contents: [
                                        {
                                            musicShelfRenderer: {
                                                contents: Array<{
                                                    musicResponsiveListItemRenderer: {
                                                        flexColumns: Array<{
                                                            musicResponsiveListItemFlexColumnRenderer: {
                                                                text: {
                                                                    runs?: [
                                                                        {
                                                                            text: string
                                                                            navigationEndpoint?: {
                                                                                watchEndpoint: watchEndpoint
                                                                            }
                                                                        },
                                                                    ]
                                                                }
                                                            }
                                                        }>
                                                    }
                                                }>
                                            }
                                        },
                                    ]
                                }
                            }
                        }
                    },
                ]
            }
        }
        header: {
            musicDetailHeaderRenderer: {
                title: {
                    runs: [
                        {
                            text: string
                        },
                    ]
                }
                subtitle: {
                    runs: Array<{
                        text: string
                        navigationEndpoint?: {
                            browseEndpoint: browseEndpoint
                        }
                    }>
                }
                thumbnail: {
                    croppedSquareThumbnailRenderer: musicThumbnailRenderer
                }
            }
        }
    }

    interface SearchResponse {
        contents: {
            tabbedSearchResultsRenderer: {
                tabs: [
                    {
                        tabRenderer: {
                            title: string
                            content: {
                                sectionListRenderer: {
                                    contents: Array<
                                        | {
                                              musicCardShelfRenderer: musicCardShelfRenderer
                                          }
                                        | {
                                              musicShelfRenderer: musicShelfRenderer
                                          }
                                    >
                                }
                            }
                        }
                    },
                ]
            }
        }
    }

    type musicCardShelfRenderer = {
        title: {
            runs: [
                {
                    text: string // Unlike musicShelfRenderer, this is the name of the top search result, be that the name of a song, album, artist, or etc.
                    navigationEndpoint:
                        | {
                              watchEndpoint: watchEndpoint
                          }
                        | {
                              browseEndpoint: browseEndpoint
                          }
                },
            ]
        }
        subtitle: {
            runs: Array<{
                text: string
                navigationEndpoint?: {
                    browseEndpoint: browseEndpoint
                }
            }>
        }
        contents?: Array<
            | {
                  messageRenderer: unknown
              }
            | {
                  musicResponsiveListItemRenderer: musicResponsiveListItemRenderer
              }
        >
        thumbnail: {
            musicThumbnailRenderer: musicThumbnailRenderer
        }
    }

    type musicShelfRenderer = {
        title: {
            runs: [
                {
                    text: 'Artists' | 'Songs' | 'Videos' | 'Albums' | 'Community playlists' | 'Podcasts' | 'Episodes' | 'Profiles'
                },
            ]
        }
        contents: Array<{
            musicResponsiveListItemRenderer: musicResponsiveListItemRenderer
        }>
    }

    interface HomeResponse {
        contents: {
            singleColumnBrowseResultsRenderer: {
                tabs: [
                    {
                        tabRenderer: {
                            content: {
                                sectionListRenderer: {
                                    contents: Array<{
                                        musicCarouselShelfRenderer: musicCarouselShelfRenderer
                                    }>
                                }
                            }
                        }
                    },
                ]
            }
        }
    }

    type musicCarouselShelfRenderer = {
        header: {
            musicCarouselShelfBasicHeaderRenderer: {
                title: {
                    runs: [
                        {
                            text: 'Listen again' | 'Forgotten favorites' | 'Quick picks' | 'New releases' | 'From your library'
                        },
                    ]
                }
            }
        }
        contents:
            | Array<{
                  musicTwoRowItemRenderer: musicTwoRowItemRenderer
              }>
            | Array<{
                  musicResponsiveListItemRenderer: musicResponsiveListItemRenderer
              }>
    }

    type musicTwoRowItemRenderer = {
        thumbnailRenderer: {
            musicThumbnailRenderer: musicThumbnailRenderer
        }
        title: {
            runs: [
                {
                    text: string
                },
            ]
        }
    } & {
        subtitle: {
            runs: Array<{
                text: string
                navigationEndpoint?: {
                    browseEndpoint: browseEndpoint
                }
            }>
        }
    }
    //     navigationEndpoint:
    //         | {
    //               watchEndpoint: watchEndpoint
    //           }
    //         | {
    //               browseEndpoint: browseEndpoint
    //           }
    //     menu?: {
    //         menuRenderer: {
    //             items: Array<
    //                 | {
    //                       menuNavigationItemRenderer: {
    //                           text: {
    //                               runs: [
    //                                   {
    //                                       text: 'Start radio' | 'Save to playlist' | 'Go to album' | 'Go to artist' | 'Share'
    //                                   },
    //                               ]
    //                           }
    //                           navigationEndpoint:
    //                               | {
    //                                     watchEndpoint: watchEndpoint
    //                                 }
    //                               | {
    //                                     addToPlaylistEndpoint: unknown
    //                                 }
    //                               | {
    //                                     browseEndpoint: browseEndpoint
    //                                 }
    //                               | {
    //                                     shareEntityEndpoint: unknown
    //                                 }
    //                       }
    //                   }
    //                 | {
    //                       menuServiceItemRenderer: unknown
    //                   }
    //                 | {
    //                       toggleMenuServiceItemRenderer: unknown
    //                   }
    //             >
    //         }
    //     }
    // }

    type musicResponsiveListItemRenderer = {
        thumbnail: {
            musicThumbnailRenderer: musicThumbnailRenderer
        }
    } & (
        | {
              flexColumns: [
                  {
                      musicResponsiveListItemFlexColumnRenderer: {
                          text: {
                              runs: [
                                  {
                                      text: string
                                      navigationEndpoint: {
                                          watchEndpoint: watchEndpoint
                                      }
                                  },
                              ]
                          }
                      }
                  },
                  {
                      musicResponsiveListItemFlexColumnRenderer: {
                          text: {
                              runs: Array<{
                                  text: string
                                  navigationEndpoint?: {
                                      browseEndpoint: browseEndpoint
                                  }
                              }>
                          }
                      }
                  },
                  {
                      musicResponsiveListItemFlexColumnRenderer: {
                          text: {
                              runs?: [
                                  {
                                      text: string
                                      navigationEndpoint?: {
                                          browseEndpoint: browseEndpoint
                                      }
                                  },
                              ]
                          }
                      }
                  }?,
              ]
          }
        | {
              flexColumns: [
                  {
                      musicResponsiveListItemFlexColumnRenderer: {
                          text: {
                              runs: [
                                  {
                                      text: string
                                  },
                              ]
                          }
                      }
                  },
                  {
                      musicResponsiveListItemFlexColumnRenderer: {
                          text: {
                              runs: Array<{
                                  text: string
                                  navigationEndpoint?: {
                                      browseEndpoint: browseEndpoint
                                  }
                              }>
                          }
                      }
                  },
              ]
              navigationEndpoint: {
                  browseEndpoint: browseEndpoint
              }
          }
    )

    type musicThumbnailRenderer = {
        thumbnail: {
            thumbnails: Array<{
                url: string
                width: number
                height: number
            }>
        }
    }

    type browseEndpoint = {
        browseId: string
        browseEndpointContextSupportedConfigs: {
            browseEndpointContextMusicConfig: {
                pageType: 'MUSIC_PAGE_TYPE_ALBUM' | 'MUSIC_PAGE_TYPE_ARTIST' | 'MUSIC_PAGE_TYPE_PLAYLIST' | 'MUSIC_PAGE_TYPE_USER_CHANNEL'
            }
        }
    }

    type watchEndpoint = {
        videoId: string
        playlistId: string
        watchEndpointMusicSupportedConfigs: {
            watchEndpointMusicConfig: {
                musicVideoType: 'MUSIC_VIDEO_TYPE_UGC' | 'MUSIC_VIDEO_TYPE_ATV' // UGC Means it is a user-uploaded video, ATV means it is auto-generated
            }
        }
    }
}
