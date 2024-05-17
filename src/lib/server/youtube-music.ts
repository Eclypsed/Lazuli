import { google, type youtube_v3 } from 'googleapis'
import ytdl from 'ytdl-core'
import { DB } from './db'
import { PUBLIC_YOUTUBE_API_CLIENT_ID } from '$env/static/public'
import { YOUTUBE_API_CLIENT_SECRET } from '$env/static/private'
import type { InnerTube } from './youtube-music-types'

const ytDataApi = google.youtube('v3')

const searchFilterParams = {
    song: 'EgWKAQIIAWoMEA4QChADEAQQCRAF',
    album: 'EgWKAQIYAWoMEA4QChADEAQQCRAF',
    artist: 'EgWKAQIgAWoMEA4QChADEAQQCRAF',
    playlist: 'Eg-KAQwIABAAGAAgACgBMABqChAEEAMQCRAFEAo%3D',
} as const

type ytMusicv1ApiRequestParams =
    | {
          type: 'browse'
          browseId: string
      }
    | {
          type: 'search'
          searchTerm: string
          filter?: 'song' | 'album' | 'artist' | 'playlist'
      }
    | {
          type: 'continuation'
          ctoken: string
      }

type ScrapedMediaItemMap<MediaItem> = MediaItem extends InnerTube.ScrapedSong
    ? Song
    : MediaItem extends InnerTube.ScrapedAlbum
      ? Album
      : MediaItem extends InnerTube.ScrapedArtist
        ? Artist
        : MediaItem extends InnerTube.ScrapedPlaylist
          ? Playlist
          : never

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

    private get accessToken() {
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

    public async getConnectionInfo() {
        const access_token = await this.accessToken.catch(() => null)

        let username: string | undefined, profilePicture: string | undefined
        if (access_token) {
            const userChannelResponse = await ytDataApi.channels.list({ mine: true, part: ['snippet'], access_token })
            const userChannel = userChannelResponse?.data.items?.[0]
            username = userChannel?.snippet?.title ?? undefined
            profilePicture = userChannel?.snippet?.thumbnails?.default?.url ?? undefined
        }

        return { id: this.id, userId: this.userId, type: 'youtube-music', youtubeUserId: this.ytUserId, username, profilePicture } satisfies ConnectionInfo
    }

    private async ytMusicv1ApiRequest(requestDetails: ytMusicv1ApiRequestParams) {
        const currentDate = new Date()
        const year = currentDate.getUTCFullYear().toString()
        const month = (currentDate.getUTCMonth() + 1).toString().padStart(2, '0') // Months are zero-based, so add 1
        const day = currentDate.getUTCDate().toString().padStart(2, '0')

        let url = 'https://music.youtube.com/youtubei/v1/'

        const body: { [k: string]: any } = {
            context: {
                client: {
                    clientName: 'WEB_REMIX',
                    clientVersion: `1.${year + month + day}.01.00`,
                    hl: 'en',
                },
            },
        }

        switch (requestDetails.type) {
            case 'browse':
                url = url.concat('browse')
                body['browseId'] = requestDetails.browseId
                break
            case 'search':
                url = url.concat('search')
                if (requestDetails.filter) body['params'] = searchFilterParams[requestDetails.filter]
                body['query'] = requestDetails.searchTerm
                break
            case 'continuation':
                url = url.concat(`browse?ctoken=${requestDetails.ctoken}&continuation=${requestDetails.ctoken}`)
                break
        }

        return fetch(url, {
            headers: await this.innertubeRequestHeaders,
            method: 'POST',
            body: JSON.stringify(body),
        }).then((response) => response.json())
    }

    public async search(searchTerm: string, filter?: 'song' | 'album' | 'artist' | 'playlist'): Promise<(Song | Album | Artist | Playlist)[]> {
        // Figure out how to handle Library and Uploads
        // Depending on how I want to handle the playlist & library sync feature

        const searchResulsts = (await this.ytMusicv1ApiRequest({ type: 'search', searchTerm, filter })) as InnerTube.SearchResponse

        const contents = searchResulsts.contents.tabbedSearchResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents

        const parsedSearchResults: (InnerTube.ScrapedSong | InnerTube.ScrapedAlbum | InnerTube.ScrapedArtist | InnerTube.ScrapedPlaylist)[] = []
        const goodSections = ['Songs', 'Videos', 'Albums', 'Artists', 'Community playlists']
        for (const section of contents) {
            if ('musicCardShelfRenderer' in section) {
                parsedSearchResults.push(parseMusicCardShelfRenderer(section.musicCardShelfRenderer))
                section.musicCardShelfRenderer.contents?.forEach((item) => {
                    if ('musicResponsiveListItemRenderer' in item) {
                        parsedSearchResults.push(parseResponsiveListItemRenderer(item.musicResponsiveListItemRenderer))
                    }
                })
                continue
            }

            const sectionType = section.musicShelfRenderer.title.runs[0].text
            if (!goodSections.includes(sectionType)) continue

            const parsedSectionContents = section.musicShelfRenderer.contents.map((item) => parseResponsiveListItemRenderer(item.musicResponsiveListItemRenderer))
            parsedSearchResults.push(...parsedSectionContents)
        }

        return await this.scrapedToMediaItems(parsedSearchResults)
    }

    public async getRecommendations(): Promise<(Song | Album | Artist | Playlist)[]> {
        const homeResponse = (await this.ytMusicv1ApiRequest({ type: 'browse', browseId: 'FEmusic_home' })) as InnerTube.HomeResponse

        const contents = homeResponse.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents

        const scrapedRecommendations: (InnerTube.ScrapedSong | InnerTube.ScrapedAlbum | InnerTube.ScrapedArtist | InnerTube.ScrapedPlaylist)[] = []
        const goodSections = ['Listen again', 'Forgotten favorites', 'Quick picks', 'From your library']
        for (const section of contents) {
            const sectionType = section.musicCarouselShelfRenderer.header.musicCarouselShelfBasicHeaderRenderer.title.runs[0].text
            if (!goodSections.includes(sectionType)) continue

            const parsedContent = section.musicCarouselShelfRenderer.contents.map((content) =>
                'musicTwoRowItemRenderer' in content ? parseTwoRowItemRenderer(content.musicTwoRowItemRenderer) : parseResponsiveListItemRenderer(content.musicResponsiveListItemRenderer),
            )
            scrapedRecommendations.push(...parsedContent)
        }

        return await this.scrapedToMediaItems(scrapedRecommendations)
    }

    public async getAudioStream(id: string, range: string | null): Promise<Response> {
        const videoInfo = await ytdl.getInfo(`http://www.youtube.com/watch?v=${id}`)
        const format = ytdl.chooseFormat(videoInfo.formats, { quality: 'highestaudio', filter: 'audioonly' })

        const headers = new Headers({ range: range || '0-' })

        return await fetch(format.url, { headers })
    }

    /**
     * @param id The browseId of the album
     * @returns Basic info about the album in the Album type schema.
     */
    public async getAlbum(id: string): Promise<Album> {
        const albumResponse = (await this.ytMusicv1ApiRequest({ type: 'browse', browseId: id })) as InnerTube.AlbumResponse

        const header = albumResponse.header.musicDetailHeaderRenderer
        const contents = albumResponse.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].musicShelfRenderer.contents

        const connection = { id: this.id, type: 'youtube-music' } satisfies Album['connection']
        const name = header.title.runs[0].text,
            thumbnailUrl = cleanThumbnailUrl(header.thumbnail.croppedSquareThumbnailRenderer.thumbnail.thumbnails[0].url)

        let artists: Album['artists'] = []
        for (const run of header.subtitle.runs) {
            if (run.text === 'Various Artists') {
                artists = 'Various Artists'
                break
            }

            if (run.navigationEndpoint?.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType === 'MUSIC_PAGE_TYPE_ARTIST') {
                artists.push({ id: run.navigationEndpoint.browseEndpoint.browseId, name: run.text })
            }
        }

        const releaseDate = header.subtitle.runs.at(-1)?.text!,
            length = contents.length

        const duration = contents.reduce(
            (accumulator, current) => (accumulator += timestampToSeconds(current.musicResponsiveListItemRenderer.fixedColumns[0].musicResponsiveListItemFixedColumnRenderer.text.runs[0].text)),
            0,
        )

        return { connection, id, name, type: 'album', duration, thumbnailUrl, artists, releaseDate, length } satisfies Album
    }

    /**
     * @param id The id of the playlist (not the browseId!).
     * @returns Basic info about the playlist in the Playlist type schema.
     */
    public async getPlaylist(id: string): Promise<Playlist> {
        const playlistResponse = (await this.ytMusicv1ApiRequest({ type: 'browse', browseId: 'VL'.concat(id) })) as InnerTube.Playlist.PlaylistResponse

        const header =
            'musicEditablePlaylistDetailHeaderRenderer' in playlistResponse.header
                ? playlistResponse.header.musicEditablePlaylistDetailHeaderRenderer.header.musicDetailHeaderRenderer
                : playlistResponse.header.musicDetailHeaderRenderer

        const connection = { id: this.id, type: 'youtube-music' } satisfies Playlist['connection']
        const name = header.title.runs[0].text

        const thumbnailUrl = cleanThumbnailUrl(
            header.thumbnail.croppedSquareThumbnailRenderer.thumbnail.thumbnails.reduce((prev, current) => (prev.width * prev.height > current.width * current.height ? prev : current)).url,
        )

        let createdBy: Playlist['createdBy']
        header.subtitle.runs.forEach((run) => {
            if (run.navigationEndpoint?.browseEndpoint.browseId) createdBy = { id: run.navigationEndpoint.browseEndpoint.browseId, name: run.text }
        })

        const trackCountText = header.secondSubtitle.runs.find((run) => run.text.includes('tracks'))!.text // "### tracks"
        const length = Number(trackCountText.split(' ')[0])

        return { connection, id, name, type: 'playlist', thumbnailUrl, createdBy, length } satisfies Playlist
    }

    public async getPlaylistItems(id: string): Promise<Song[]> {
        const playlistResponse = (await this.ytMusicv1ApiRequest({ type: 'browse', browseId: 'VL'.concat(id) })) as InnerTube.Playlist.PlaylistResponse

        const contents = playlistResponse.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].musicPlaylistShelfRenderer.contents
        let continuation =
            playlistResponse.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].musicPlaylistShelfRenderer.continuations?.[0].nextContinuationData.continuation

        while (continuation) {
            const continuationResponse = (await this.ytMusicv1ApiRequest({ type: 'continuation', ctoken: continuation })) as InnerTube.Playlist.ContinuationResponse

            contents.push(...continuationResponse.continuationContents.musicPlaylistShelfContinuation.contents)
            continuation = continuationResponse.continuationContents.musicPlaylistShelfContinuation.continuations?.[0].nextContinuationData.continuation
        }

        const playlistItems: InnerTube.ScrapedSong[] = []
        contents.forEach((item) => {
            const [col0, col1, col2] = item.musicResponsiveListItemRenderer.flexColumns

            // This is simply to handle completely fucked playlists where the playlist items might be missing navigation endpoints (e.g. Deleted Videos)
            // or in some really bad cases, have a navigationEndpoint, but not a watchEndpoint somehow (Possibly for unlisted/private content?)
            if (!col0.musicResponsiveListItemFlexColumnRenderer.text.runs[0].navigationEndpoint?.watchEndpoint?.videoId) return

            const id = col0.musicResponsiveListItemFlexColumnRenderer.text.runs[0].navigationEndpoint.watchEndpoint.videoId
            const name = col0.musicResponsiveListItemFlexColumnRenderer.text.runs[0].text

            const videoType = col0.musicResponsiveListItemFlexColumnRenderer.text.runs[0].navigationEndpoint.watchEndpoint.watchEndpointMusicSupportedConfigs.watchEndpointMusicConfig.musicVideoType
            const isVideo = videoType !== 'MUSIC_VIDEO_TYPE_ATV'

            const thumbnailUrl = isVideo ? undefined : cleanThumbnailUrl(item.musicResponsiveListItemRenderer.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails[0].url)

            const col2run = col2.musicResponsiveListItemFlexColumnRenderer.text.runs?.[0]
            const album: Song['album'] = col2run ? { id: col2run.navigationEndpoint.browseEndpoint.browseId, name: col2run.text } : undefined

            let artists: Song['artists'] = [],
                uploader: Song['uploader']

            for (const run of col1.musicResponsiveListItemFlexColumnRenderer.text.runs) {
                if (!run.navigationEndpoint) continue

                const pageType = run.navigationEndpoint?.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType
                const runData = { id: run.navigationEndpoint.browseEndpoint.browseId, name: run.text }

                pageType === 'MUSIC_PAGE_TYPE_ARTIST' ? artists.push(runData) : (uploader = runData)
            }

            playlistItems.push({ id, name, type: 'song', thumbnailUrl, artists, album, uploader, isVideo })
        })

        return await this.scrapedToMediaItems(playlistItems)
    }

    private async scrapedToMediaItems<T extends (InnerTube.ScrapedSong | InnerTube.ScrapedAlbum | InnerTube.ScrapedArtist | InnerTube.ScrapedPlaylist)[]>(scrapedItems: T): Promise<ScrapedMediaItemMap<T[number]>[]> {
        const songIds = new Set<string>(),
            albumIds = new Set<string>(),
            artistIds = new Set<string>(),
            playlistIds = new Set<string>()

        scrapedItems.forEach((item) => {
            switch (item.type) {
                case 'song':
                    songIds.add(item.id)
                    if (item.album?.id) albumIds.add(item.album.id)
                    item.artists?.forEach((artist) => artistIds.add(artist.id))
                    break
                case 'album':
                    albumIds.add(item.id)
                    if (item.artists instanceof Array) item.artists.forEach((artist) => artistIds.add(artist.id))
                    break
                case 'artist':
                    artistIds.add(item.id)
                    break
                case 'playlist':
                    playlistIds.add(item.id)
                    break
            }
        })

        const access_token = await this.accessToken

        const getSongDetails = () => ytDataApi.videos.list({ part: ['snippet', 'contentDetails'], id: Array.from(songIds), access_token })
        const getAlbumDetails = () => Promise.all(Array.from(albumIds).map((id) => this.getAlbum(id)))
        const getPlaylistDetails = () => Promise.all(Array.from(playlistIds).map((id) => this.getPlaylist(id)))

        const [songDetails, albumDetails, playlistDetails] = await Promise.all([getSongDetails(), getAlbumDetails(), getPlaylistDetails()])
        const songDetailsMap = new Map<string, youtube_v3.Schema$Video>(),
            albumDetailsMap = new Map<string, Album>(),
            playlistDetailsMap = new Map<string, Playlist>()

        songDetails.data.items!.forEach((item) => songDetailsMap.set(item.id!, item))
        albumDetails.forEach((album) => albumDetailsMap.set(album.id, album))
        playlistDetails.forEach((playlist) => playlistDetailsMap.set(playlist.id, playlist))

        const connection = { id: this.id, type: 'youtube-music' } satisfies (Song | Album | Artist | Playlist)['connection']

        return scrapedItems.map((item) => {
            switch (item.type) {
                case 'song':
                    const { id, name, artists, album, isVideo, uploader } = item
                    const songDetails = songDetailsMap.get(id)!
                    const duration = secondsFromISO8601(songDetails.contentDetails?.duration!)

                    const thumbnails = songDetails.snippet?.thumbnails!
                    const thumbnailUrl = item.thumbnailUrl ?? thumbnails.maxres?.url ?? thumbnails.standard?.url ?? thumbnails.high?.url ?? thumbnails.medium?.url ?? thumbnails.default?.url!

                    let songReleaseDate = new Date(songDetails.snippet?.publishedAt!)

                    const albumDetails = album ? albumDetailsMap.get(album.id)! : undefined
                    const fullAlbum = (albumDetails ? { id: albumDetails.id, name: albumDetails.name, thumbnailUrl: albumDetails.thumbnailUrl } : undefined) satisfies Song['album']

                    if (albumDetails?.releaseDate) {
                        const albumReleaseDate = new Date(albumDetails.releaseDate)
                        if (albumReleaseDate.getFullYear() < songReleaseDate.getFullYear()) songReleaseDate = albumReleaseDate
                    }

                    const releaseDate = songReleaseDate.toISOString()

                    return { connection, id, name, type: 'song', duration, thumbnailUrl, releaseDate, artists, album: fullAlbum, isVideo, uploader } satisfies Song
                case 'album':
                    return albumDetailsMap.get(item.id)! satisfies Album
                case 'artist':
                    return { connection, id: item.id, name: item.name, type: 'artist', profilePicture: item.profilePicture } satisfies Artist
                case 'playlist':
                    return playlistDetailsMap.get(item.id)! satisfies Playlist
            }
        }) as ScrapedMediaItemMap<T[number]>[]
    }
}

function parseTwoRowItemRenderer(rowContent: InnerTube.musicTwoRowItemRenderer): InnerTube.ScrapedSong | InnerTube.ScrapedAlbum | InnerTube.ScrapedArtist | InnerTube.ScrapedPlaylist {
    const name = rowContent.title.runs[0].text

    let artists: InnerTube.ScrapedSong['artists'] | InnerTube.ScrapedAlbum['artists'] = [],
        creator: InnerTube.ScrapedSong['uploader'] | InnerTube.ScrapedPlaylist['createdBy']

    rowContent.subtitle.runs.forEach((run) => {
        if (run.text === 'Various Artists') return (artists = 'Various Artists')
        if (!run.navigationEndpoint) return

        const pageType = run.navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType,
            id = run.navigationEndpoint.browseEndpoint.browseId,
            name = run.text

        switch (pageType) {
            case 'MUSIC_PAGE_TYPE_ARTIST':
                if (artists instanceof Array) artists.push({ id, name })
                break
            case 'MUSIC_PAGE_TYPE_USER_CHANNEL':
                creator = { id, name }
                break
        }
    })

    if ('watchEndpoint' in rowContent.navigationEndpoint) {
        const id = rowContent.navigationEndpoint.watchEndpoint.videoId
        const musicVideoType = rowContent.navigationEndpoint.watchEndpoint.watchEndpointMusicSupportedConfigs.watchEndpointMusicConfig.musicVideoType
        const isVideo = musicVideoType === 'MUSIC_VIDEO_TYPE_UGC' || musicVideoType === 'MUSIC_VIDEO_TYPE_OMV'
        const thumbnailUrl: InnerTube.ScrapedSong['thumbnailUrl'] = isVideo ? undefined : cleanThumbnailUrl(rowContent.thumbnailRenderer.musicThumbnailRenderer.thumbnail.thumbnails[0].url)

        let albumId: string | undefined
        rowContent.menu?.menuRenderer.items.forEach((menuOption) => {
            if (
                'menuNavigationItemRenderer' in menuOption &&
                'browseEndpoint' in menuOption.menuNavigationItemRenderer.navigationEndpoint &&
                menuOption.menuNavigationItemRenderer.navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType === 'MUSIC_PAGE_TYPE_ALBUM'
            )
                albumId = menuOption.menuNavigationItemRenderer.navigationEndpoint.browseEndpoint.browseId
        })

        const album: InnerTube.ScrapedSong['album'] = albumId ? { id: albumId } : undefined

        return { id, name, type: 'song', thumbnailUrl, artists, album, uploader: creator, isVideo } satisfies InnerTube.ScrapedSong
    }

    const pageType = rowContent.navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType
    const id = rowContent.navigationEndpoint.browseEndpoint.browseId

    switch (pageType) {
        case 'MUSIC_PAGE_TYPE_ALBUM':
            const thumbnailUrl = cleanThumbnailUrl(rowContent.thumbnailRenderer.musicThumbnailRenderer.thumbnail.thumbnails[0].url)
            return { id, name, type: 'album', artists, thumbnailUrl } satisfies InnerTube.ScrapedAlbum
        case 'MUSIC_PAGE_TYPE_ARTIST':
        case 'MUSIC_PAGE_TYPE_USER_CHANNEL':
            const profilePicture = cleanThumbnailUrl(rowContent.thumbnailRenderer.musicThumbnailRenderer.thumbnail.thumbnails[0].url)
            return { id, name, type: 'artist', profilePicture } satisfies InnerTube.ScrapedArtist
        case 'MUSIC_PAGE_TYPE_PLAYLIST':
            return { id: id.slice(2), name, type: 'playlist', createdBy: creator! } satisfies InnerTube.ScrapedPlaylist
    }
}

function parseResponsiveListItemRenderer(listContent: InnerTube.musicResponsiveListItemRenderer): InnerTube.ScrapedSong | InnerTube.ScrapedAlbum | InnerTube.ScrapedArtist | InnerTube.ScrapedPlaylist {
    const name = listContent.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].text
    const column1Runs = listContent.flexColumns[1].musicResponsiveListItemFlexColumnRenderer.text.runs

    let artists: InnerTube.ScrapedSong['artists'] | InnerTube.ScrapedAlbum['artists'] = [],
        creator: InnerTube.ScrapedSong['uploader'] | InnerTube.ScrapedPlaylist['createdBy']

    column1Runs.forEach((run) => {
        if (run.text === 'Various Artists') return (artists = 'Various Artists')
        if (!run.navigationEndpoint) return

        const pageType = run.navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType,
            id = run.navigationEndpoint.browseEndpoint.browseId,
            name = run.text

        switch (pageType) {
            case 'MUSIC_PAGE_TYPE_ARTIST':
                if (artists instanceof Array) artists.push({ id, name })
                break
            case 'MUSIC_PAGE_TYPE_USER_CHANNEL':
                creator = { id, name }
                break
        }
    })

    if (!('navigationEndpoint' in listContent)) {
        const id = listContent.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].navigationEndpoint.watchEndpoint.videoId
        const musicVideoType = listContent.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].navigationEndpoint.watchEndpoint.watchEndpointMusicSupportedConfigs.watchEndpointMusicConfig.musicVideoType
        const isVideo = musicVideoType !== 'MUSIC_VIDEO_TYPE_ATV'
        const thumbnailUrl = isVideo ? undefined : cleanThumbnailUrl(listContent.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails[0].url)

        const column2run = listContent.flexColumns[2]?.musicResponsiveListItemFlexColumnRenderer.text.runs?.[0]
        const album =
            column2run?.navigationEndpoint?.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType === 'MUSIC_PAGE_TYPE_ALBUM'
                ? { id: column2run.navigationEndpoint.browseEndpoint.browseId, name: column2run.text }
                : undefined

        return { id, name, type: 'song', thumbnailUrl, artists, album, uploader: creator, isVideo } satisfies InnerTube.ScrapedSong
    }

    const id = listContent.navigationEndpoint.browseEndpoint.browseId
    const pageType = listContent.navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType

    switch (pageType) {
        case 'MUSIC_PAGE_TYPE_ALBUM':
            const thumbnailUrl = cleanThumbnailUrl(listContent.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails[0].url)
            return { id, name, type: 'album', thumbnailUrl, artists } satisfies InnerTube.ScrapedAlbum
        case 'MUSIC_PAGE_TYPE_ARTIST':
        case 'MUSIC_PAGE_TYPE_USER_CHANNEL':
            const profilePicture = cleanThumbnailUrl(listContent.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails[0].url)
            return { id, name, type: 'artist', profilePicture } satisfies InnerTube.ScrapedArtist
        case 'MUSIC_PAGE_TYPE_PLAYLIST':
            return { id: id.slice(2), name, type: 'playlist', createdBy: creator! } satisfies InnerTube.ScrapedPlaylist
    }
}

function parseMusicCardShelfRenderer(cardContent: InnerTube.musicCardShelfRenderer): InnerTube.ScrapedSong | InnerTube.ScrapedAlbum | InnerTube.ScrapedArtist | InnerTube.ScrapedPlaylist {
    const name = cardContent.title.runs[0].text

    let album: Song['album'],
        artists: InnerTube.ScrapedSong['artists'] | InnerTube.ScrapedAlbum['artists'] = [],
        creator: Song['uploader'] | Playlist['createdBy']

    for (const run of cardContent.subtitle.runs) {
        if (!run.navigationEndpoint) continue

        const pageType = run.navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType
        const runData = { id: run.navigationEndpoint.browseEndpoint.browseId, name: run.text }
        switch (pageType) {
            case 'MUSIC_PAGE_TYPE_ALBUM':
                album = runData
                break
            case 'MUSIC_PAGE_TYPE_ARTIST':
                artists.push(runData)
                break
            case 'MUSIC_PAGE_TYPE_USER_CHANNEL':
                creator = runData
                break
        }
    }

    const navigationEndpoint = cardContent.title.runs[0].navigationEndpoint
    if ('watchEndpoint' in navigationEndpoint) {
        const id = navigationEndpoint.watchEndpoint.videoId
        const musicVideoType = navigationEndpoint.watchEndpoint.watchEndpointMusicSupportedConfigs.watchEndpointMusicConfig.musicVideoType
        const isVideo = musicVideoType !== 'MUSIC_VIDEO_TYPE_ATV'
        const thumbnailUrl = isVideo ? undefined : cleanThumbnailUrl(cardContent.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails[0].url)

        return { id, name, type: 'song', thumbnailUrl, artists, album, uploader: creator, isVideo } satisfies InnerTube.ScrapedSong
    }

    const pageType = navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType
    const id = navigationEndpoint.browseEndpoint.browseId
    switch (pageType) {
        case 'MUSIC_PAGE_TYPE_ALBUM':
            const thumbnailUrl = cleanThumbnailUrl(cardContent.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails[0].url)
            return { id, name, type: 'album', thumbnailUrl, artists } satisfies InnerTube.ScrapedAlbum
        case 'MUSIC_PAGE_TYPE_ARTIST':
        case 'MUSIC_PAGE_TYPE_USER_CHANNEL':
            const profilePicture = cleanThumbnailUrl(cardContent.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails[0].url)
            return { id, name, type: 'artist', profilePicture } satisfies InnerTube.ScrapedArtist
        case 'MUSIC_PAGE_TYPE_PLAYLIST':
            return { id: id.slice(2), name, type: 'playlist', createdBy: creator! } satisfies InnerTube.ScrapedPlaylist
    }
}

/**
 * @param duration Timestamp in standard ISO8601 format PnDTnHnMnS
 * @returns The duration of the timestamp in seconds
 */
function secondsFromISO8601(duration: string): number {
    const iso8601DurationRegex = /P(?:([.,\d]+)D)?T(?:([.,\d]+)H)?(?:([.,\d]+)M)?(?:([.,\d]+)S)?/ // Credit: https://stackoverflow.com/users/1195273/crush
    const result = iso8601DurationRegex.exec(duration)
    const days = result?.[1] ?? 0,
        hours = result?.[2] ?? 0,
        minutes = result?.[3] ?? 0,
        seconds = result?.[4] ?? 0
    return Number(seconds) + Number(minutes) * 60 + Number(hours) * 3600 + Number(days) * 86400
}

/** Remove YouTube's fake query parameters from their thumbnail urls returning the base url for as needed modification.
 * Valid URL origins:
 * - https://lh3.googleusercontent.com
 * - https://yt3.googleusercontent.com
 * - https://yt3.ggpht.com
 * - https://music.youtube.com
 * - https://i.ytimg.com
 *
 * NOTE:
 * https://i.ytimg.com corresponds to videos, which follow the mqdefault...maxres resolutions scale. It is generally bad practice to use these as there is no way to scale them with query params, and there is no way to tell if a maxres.jpg exists or not.
 * It is generally best practice to not directly scrape these video thumbnails directly from youtube and insted get the highest res from the v3 api.
 * However there a few instances in which we want to scrape a thumbail directly from the webapp (e.g. Playlist thumbanils) so it still remains valid.
 */
function cleanThumbnailUrl(urlString: string): string {
    if (!URL.canParse(urlString)) throw new Error('Invalid thumbnail url')

    switch (new URL(urlString).origin) {
        case 'https://lh3.googleusercontent.com':
        case 'https://yt3.googleusercontent.com':
        case 'https://yt3.ggpht.com':
            return urlString.slice(0, urlString.indexOf('='))
        case 'https://music.youtube.com':
            return urlString
        case 'https://i.ytimg.com':
            return urlString.slice(0, urlString.indexOf('?'))
        default:
            console.error('Tried to clean invalid url: ' + urlString)
            throw new Error('Invalid thumbnail url origin')
    }
}

/**
 * @param timestamp A string in the format Hours:Minutes:Seconds (Standard Timestamp format on YouTube)
 * @returns The total duration of that timestamp in seconds
 */
const timestampToSeconds = (timestamp: string) =>
    timestamp
        .split(':')
        .reverse()
        .reduce((accumulator, current, index) => (accumulator += Number(current) * 60 ** index), 0)
