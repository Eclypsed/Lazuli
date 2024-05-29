import { google, type youtube_v3 } from 'googleapis'
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

    private accessTokenRefreshRequest: Promise<string> | null = null
    private get accessToken() {
        const refreshAccessToken = async () => {
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
                return { accessToken: access_token as string, expiry }
            }

            throw Error(`Failed to refresh access tokens for YouTube Music connection: ${this.id}`)
        }

        if (this.expiry > Date.now()) return new Promise<string>((resolve) => resolve(this.currentAccessToken))

        if (this.accessTokenRefreshRequest) return this.accessTokenRefreshRequest

        this.accessTokenRefreshRequest = refreshAccessToken()
            .then(({ accessToken, expiry }) => {
                DB.updateTokens(this.id, { accessToken, refreshToken: this.refreshToken, expiry })
                this.currentAccessToken = accessToken
                this.expiry = expiry
                this.accessTokenRefreshRequest = null
                return accessToken
            })
            .catch((error: Error) => {
                this.accessTokenRefreshRequest = null
                throw error
            })

        return this.accessTokenRefreshRequest
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
        const headers = new Headers({
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0',
            authorization: `Bearer ${await this.accessToken}`,
        })

        const currentDate = new Date()
        const year = currentDate.getUTCFullYear().toString()
        const month = (currentDate.getUTCMonth() + 1).toString().padStart(2, '0') // Months are zero-based, so add 1
        const day = currentDate.getUTCDate().toString().padStart(2, '0')

        const context = {
            client: {
                clientName: 'WEB_REMIX',
                clientVersion: `1.${year + month + day}.01.00`,
            },
        }

        let url: string
        let body: Record<string, any>

        switch (requestDetails.type) {
            case 'browse':
                url = 'https://music.youtube.com/youtubei/v1/browse'
                body = {
                    browseId: requestDetails.browseId,
                    context,
                }
                break
            case 'search':
                url = 'https://music.youtube.com/youtubei/v1/search'
                body = {
                    query: requestDetails.searchTerm,
                    filter: requestDetails.filter ? searchFilterParams[requestDetails.filter] : undefined,
                    context,
                }
                break
            case 'continuation':
                url = `https://music.youtube.com/youtubei/v1/browse?ctoken=${requestDetails.ctoken}&continuation=${requestDetails.ctoken}`
                body = {
                    context,
                }
                break
        }

        return fetch(url, { headers, method: 'POST', body: JSON.stringify(body) })
    }

    // TODO: Figure out why this still breaks sometimes (Figured out one cause: "Episodes" can appear as videos)
    public async search(searchTerm: string, filter: 'song'): Promise<Song[]>
    public async search(searchTerm: string, filter: 'album'): Promise<Album[]>
    public async search(searchTerm: string, filter: 'artist'): Promise<Artist[]>
    public async search(searchTerm: string, filter: 'playlist'): Promise<Playlist[]>
    public async search(searchTerm: string, filter?: undefined): Promise<(Song | Album | Artist | Playlist)[]>
    public async search(searchTerm: string, filter?: 'song' | 'album' | 'artist' | 'playlist'): Promise<(Song | Album | Artist | Playlist)[]> {
        // Figure out how to handle Library and Uploads
        // Depending on how I want to handle the playlist & library sync feature

        const searchResulsts = (await this.ytMusicv1ApiRequest({ type: 'search', searchTerm, filter }).then((response) => response.json())) as InnerTube.SearchResponse

        const contents = searchResulsts.contents.tabbedSearchResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents

        try {
            const parsedSearchResults = []
            const goodSections = ['Songs', 'Videos', 'Albums', 'Artists', 'Community playlists']
            for (const section of contents) {
                if ('itemSectionRenderer' in section) continue

                if ('musicCardShelfRenderer' in section) {
                    parsedSearchResults.push(parseMusicCardShelfRenderer(section.musicCardShelfRenderer))
                    section.musicCardShelfRenderer.contents?.forEach((item) => {
                        if ('musicResponsiveListItemRenderer' in item) {
                            try {
                                // ! TEMPORARY I need to rework all my parsers to be able to handle edge cases
                                parsedSearchResults.push(parseResponsiveListItemRenderer(item.musicResponsiveListItemRenderer))
                            } catch {
                                return
                            }
                        }
                    })
                    continue
                }

                const sectionType = section.musicShelfRenderer.title.runs[0].text
                if (!goodSections.includes(sectionType)) continue

                section.musicShelfRenderer.contents.forEach((item) => {
                    try {
                        // ! TEMPORARY I need to rework all my parsers to be able to handle edge cases
                        parsedSearchResults.push(parseResponsiveListItemRenderer(item.musicResponsiveListItemRenderer))
                    } catch {
                        return
                    }
                })
            }

            return this.scrapedToMediaItems(parsedSearchResults)
        } catch (error) {
            console.log(error)
            console.log(JSON.stringify(contents))
            throw Error('Something fucked up')
        }
    }

    // TODO: Figure out why this still breaks sometimes (Figured out one cause: "Episodes" can appear as videos)
    public async getRecommendations() {
        const homeResponse = (await this.ytMusicv1ApiRequest({ type: 'browse', browseId: 'FEmusic_home' }).then((response) => response.json())) as InnerTube.HomeResponse

        const contents = homeResponse.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents

        try {
            const scrapedRecommendations: (InnerTube.ScrapedSong | InnerTube.ScrapedAlbum | InnerTube.ScrapedArtist | InnerTube.ScrapedPlaylist)[] = []
            const goodSections = ['Listen again', 'Forgotten favorites', 'Quick picks', 'From your library', 'Recommended music videos', 'Recommended albums']
            for (const section of contents) {
                const sectionType = section.musicCarouselShelfRenderer.header.musicCarouselShelfBasicHeaderRenderer.title.runs[0].text
                if (!goodSections.includes(sectionType)) continue

                const parsedContent = section.musicCarouselShelfRenderer.contents.map((content) =>
                    'musicTwoRowItemRenderer' in content ? parseTwoRowItemRenderer(content.musicTwoRowItemRenderer) : parseResponsiveListItemRenderer(content.musicResponsiveListItemRenderer),
                )
                scrapedRecommendations.push(...parsedContent)
            }

            return this.scrapedToMediaItems(scrapedRecommendations)
        } catch (error) {
            console.log(error)
            console.log(JSON.stringify(contents))
            throw Error('Something fucked up')
        }
    }

    public async getAudioStream(id: string, headers: Headers) {
        if (!/^[a-zA-Z0-9-_]{11}$/.test(id)) throw TypeError('Invalid youtube video Id')

        // ? In the future, may want to implement the TVHTML5_SIMPLY_EMBEDDED_PLAYER client method both in order to bypass age-restrictions and just to serve as a fallback
        // ? However this has the downsides of being slower and (I think) requiring the user's cookies if the video is premium exclusive.
        // ? Ideally, I want to avoid having to mess with a user's cookies at all costs because:
        // ?    a) It's another security risk
        // ?    b) A user would have to manually copy them over, which is about as user friendly as a kick to the face
        // ?    c) Cookies get updated with every request, meaning the db would get hit more frequently, and it's just another thing to maintain
        // ? Ulimately though, I may have to implment cookie support anyway dependeding on how youtube tracks a user's watch history and prefrences

        // * MASSIVE props and credit to Oleksii Holub for documenting the android client method of player fetching (See refrences at bottom).
        // * Go support him and go support Ukraine (he's Ukrainian)

        const playerResponse = await fetch('https://www.youtube.com/youtubei/v1/player', {
            headers: {
                // 'user-agent': 'com.google.android.youtube/17.36.4 (Linux; U; Android 12; GB) gzip', <-- I thought this was necessary but it appears it might not be?
                authorization: `Bearer ${await this.accessToken}`, // * Including the access token is what enables access to premium content
            },
            method: 'POST',
            body: JSON.stringify({
                videoId: id,
                context: {
                    client: {
                        clientName: 'ANDROID_TESTSUITE',
                        clientVersion: '1.9',
                        // androidSdkVersion: 30, <-- I thought this was necessary but it appears it might not be?
                    },
                },
            }),
        })
            .then((response) => response.json() as Promise<InnerTube.Player.PlayerResponse | InnerTube.Player.PlayerErrorResponse>)
            .catch(() => null)

        if (!playerResponse) throw Error(`Failed to fetch player for song ${id} of connection ${this.id}`)

        if (!('streamingData' in playerResponse)) {
            if (playerResponse.playabilityStatus.reason === 'This video is unavailable') throw TypeError('Invalid youtube video Id')

            const errorMessage = `Unknown player response error: ${playerResponse.playabilityStatus.reason}`
            console.error(errorMessage)
            throw Error(errorMessage)
        }

        const formats = playerResponse.streamingData.formats?.concat(playerResponse.streamingData.adaptiveFormats ?? [])
        const audioOnlyFormats = formats?.filter(
            (format): format is HasDefinedProperty<InnerTube.Player.Format, 'url' | 'audioQuality'> =>
                format.qualityLabel === undefined &&
                format.audioQuality !== undefined &&
                format.url !== undefined &&
                !/\bsource[/=]yt_live_broadcast\b/.test(format.url) && // Filters out live broadcasts
                !/\/manifest\/hls_(variant|playlist)\//.test(format.url) && // Filters out HLS streams (Might not be applicable to the ANDROID_TESTSUITE client)
                !/\/manifest\/dash\//.test(format.url), // Filters out DashMPD streams (Might not be applicable to the ANDROID_TESTSUITE client)
            // ? For each of the three above filters, I may want to look into how to support them.
            // ? Especially live streams, being able to support those live music stream channels seems like a necessary feature.
            // ? HLS and DashMPD I *think* are more efficient so it would be nice to support those too, if applicable.
        )

        if (!audioOnlyFormats || audioOnlyFormats.length === 0) throw Error(`No valid audio formats returned for song ${id} of connection ${this.id}`)

        const hqAudioFormat = audioOnlyFormats.reduce((previous, current) => (previous.bitrate > current.bitrate ? previous : current))

        return fetch(hqAudioFormat.url, { headers })
    }

    /**
     * @param id The browseId of the album
     */
    public async getAlbum(id: string): Promise<Album> {
        const albumResponse = (await this.ytMusicv1ApiRequest({ type: 'browse', browseId: id }).then((response) => response.json())) as InnerTube.Album.AlbumResponse

        const header = albumResponse.header.musicDetailHeaderRenderer

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

        const releaseYear = header.subtitle.runs.at(-1)?.text!

        return { connection, id, name, type: 'album', thumbnailUrl, artists, releaseYear } satisfies Album
    }

    /**
     * @param id The browseId of the album
     */
    public async getAlbumItems(id: string): Promise<Song[]> {
        const albumResponse = (await this.ytMusicv1ApiRequest({ type: 'browse', browseId: id }).then((response) => response.json())) as InnerTube.Album.AlbumResponse

        const header = albumResponse.header.musicDetailHeaderRenderer

        const contents = albumResponse.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].musicShelfRenderer.contents
        let continuation = albumResponse.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].musicShelfRenderer.continuations?.[0].nextContinuationData.continuation

        const connection = { id: this.id, type: 'youtube-music' } satisfies Song['connection']
        const thumbnailUrl = cleanThumbnailUrl(header.thumbnail.croppedSquareThumbnailRenderer.thumbnail.thumbnails[0].url)
        const album: Song['album'] = { id, name: header.title.runs[0].text }

        const albumArtists = header.subtitle.runs
            .filter((run) => run.navigationEndpoint?.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType === 'MUSIC_PAGE_TYPE_ARTIST')
            .map((run) => ({ id: run.navigationEndpoint!.browseEndpoint.browseId, name: run.text }))

        while (continuation) {
            const continuationResponse = (await this.ytMusicv1ApiRequest({ type: 'continuation', ctoken: continuation }).then((response) => response.json())) as InnerTube.Album.ContinuationResponse

            contents.push(...continuationResponse.continuationContents.musicShelfContinuation.contents)
            continuation = continuationResponse.continuationContents.musicShelfContinuation.continuations?.[0].nextContinuationData.continuation
        }

        // Just putting this here in the event that for some reason an album has non-playlable items, never seen it happen but couldn't hurt
        const playableItems = contents.filter((item) => item.musicResponsiveListItemRenderer.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].navigationEndpoint?.watchEndpoint?.videoId !== undefined)

        const dividedItems = []
        for (let i = 0; i < playableItems.length; i += 50) dividedItems.push(playableItems.slice(i, i + 50))

        const access_token = await this.accessToken
        const videoSchemas = await Promise.all(
            dividedItems.map((chunk) =>
                ytDataApi.videos.list({
                    part: ['snippet'],
                    id: chunk.map((item) => item.musicResponsiveListItemRenderer.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].navigationEndpoint.watchEndpoint.videoId),
                    access_token,
                }),
            ),
        ).then((responses) => responses.map((response) => response.data.items!).flat())

        const descriptionRelease = videoSchemas.find((video) => video.snippet?.description?.match(/Released on: \d{4}-\d{2}-\d{2}/)?.[0] !== undefined)?.snippet?.description?.match(/Released on: \d{4}-\d{2}-\d{2}/)?.[0]
        const releaseDate = new Date(descriptionRelease ?? header.subtitle.runs.at(-1)?.text!).toISOString()

        const videoChannelMap = new Map<string, string>()
        videoSchemas.forEach((video) => videoChannelMap.set(video.id!, video.snippet?.channelId!))

        return playableItems.map((item) => {
            const [col0, col1] = item.musicResponsiveListItemRenderer.flexColumns

            const id = col0.musicResponsiveListItemFlexColumnRenderer.text.runs[0].navigationEndpoint.watchEndpoint.videoId
            const name = col0.musicResponsiveListItemFlexColumnRenderer.text.runs[0].text

            const videoType = col0.musicResponsiveListItemFlexColumnRenderer.text.runs[0].navigationEndpoint.watchEndpoint.watchEndpointMusicSupportedConfigs.watchEndpointMusicConfig.musicVideoType
            const isVideo = videoType !== 'MUSIC_VIDEO_TYPE_ATV'

            const duration = timestampToSeconds(item.musicResponsiveListItemRenderer.fixedColumns[0].musicResponsiveListItemFixedColumnRenderer.text.runs[0].text)

            const artists = col1.musicResponsiveListItemFlexColumnRenderer.text.runs?.map((run) => ({ id: run.navigationEndpoint?.browseEndpoint.browseId ?? videoChannelMap.get(id)!, name: run.text })) ?? albumArtists

            return { connection, id, name, type: 'song', duration, thumbnailUrl, releaseDate, artists, album, isVideo }
        })
    }

    /**
     * @param id The id of the playlist (not the browseId!).
     */
    public async getPlaylist(id: string): Promise<Playlist> {
        const playlistResponse = await this.ytMusicv1ApiRequest({ type: 'browse', browseId: 'VL'.concat(id) })
            .then((response) => response.json() as Promise<InnerTube.Playlist.PlaylistResponse | InnerTube.Playlist.PlaylistErrorResponse>)
            .catch(() => null)

        if (!playlistResponse) throw Error(`Failed to fetch playlist ${id} of connection ${this.id}`)

        if ('error' in playlistResponse) {
            if (playlistResponse.error.status === 'NOT_FOUND' || playlistResponse.error.status === 'INVALID_ARGUMENT') throw TypeError('Invalid youtube playlist id')

            const errorMessage = `Unknown playlist response error: ${playlistResponse.error.message}`
            console.error(errorMessage)
            throw Error(errorMessage)
        }

        const header =
            'musicEditablePlaylistDetailHeaderRenderer' in playlistResponse.header
                ? playlistResponse.header.musicEditablePlaylistDetailHeaderRenderer.header.musicDetailHeaderRenderer
                : playlistResponse.header.musicDetailHeaderRenderer

        const connection = { id: this.id, type: 'youtube-music' } satisfies Playlist['connection']
        const name = header.title.runs[0].text

        const thumbnailUrl = cleanThumbnailUrl(
            header.thumbnail.croppedSquareThumbnailRenderer.thumbnail.thumbnails.reduce((prev, current) => (prev.width * prev.height > current.width * current.height ? prev : current)).url, // This is because sometimes the thumbnails for playlists can be video thumbnails
        )

        let createdBy: Playlist['createdBy']
        header.subtitle.runs.forEach((run) => {
            if (run.navigationEndpoint?.browseEndpoint.browseId) createdBy = { id: run.navigationEndpoint.browseEndpoint.browseId, name: run.text }
        })

        return { connection, id, name, type: 'playlist', thumbnailUrl, createdBy } satisfies Playlist
    }

    /**
     * @param id The id of the playlist (not the browseId!).
     * @param startIndex The index to start at (0 based). All playlist items with a lower index will be dropped from the results
     * @param limit The maximum number of playlist items to return
     */
    public async getPlaylistItems(id: string, startIndex?: number, limit?: number): Promise<Song[]> {
        const playlistResponse = await this.ytMusicv1ApiRequest({ type: 'browse', browseId: 'VL'.concat(id) })
            .then((response) => response.json() as Promise<InnerTube.Playlist.PlaylistResponse | InnerTube.Playlist.PlaylistErrorResponse>)
            .catch(() => null)

        if (!playlistResponse) throw Error(`Failed to fetch playlist ${id} of connection ${this.id}`)

        if ('error' in playlistResponse) {
            if (playlistResponse.error.status === 'NOT_FOUND' || playlistResponse.error.status === 'INVALID_ARGUMENT') throw TypeError('Invalid youtube playlist id')

            const errorMessage = `Unknown playlist items response error: ${playlistResponse.error.message}`
            console.error(errorMessage)
            throw Error(errorMessage)
        }

        const playableContents = playlistResponse.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].musicPlaylistShelfRenderer.contents.filter(
            (item) => item.musicResponsiveListItemRenderer.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].navigationEndpoint?.watchEndpoint?.videoId !== undefined,
        )

        let continuation =
            playlistResponse.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].musicPlaylistShelfRenderer.continuations?.[0].nextContinuationData.continuation

        while (continuation && (!limit || playableContents.length < (startIndex ?? 0) + limit)) {
            const continuationResponse = (await this.ytMusicv1ApiRequest({ type: 'continuation', ctoken: continuation }).then((response) => response.json())) as InnerTube.Playlist.ContinuationResponse
            const playableContinuationContents = continuationResponse.continuationContents.musicPlaylistShelfContinuation.contents.filter(
                (item) => item.musicResponsiveListItemRenderer.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].navigationEndpoint?.watchEndpoint?.videoId !== undefined,
            )

            playableContents.push(...playableContinuationContents)
            continuation = continuationResponse.continuationContents.musicPlaylistShelfContinuation.continuations?.[0].nextContinuationData.continuation
        }

        const scrapedItems = playableContents.slice(startIndex ?? 0, limit ? (startIndex ?? 0) + limit : undefined).map((item) => {
            const [col0, col1, col2] = item.musicResponsiveListItemRenderer.flexColumns

            const id = col0.musicResponsiveListItemFlexColumnRenderer.text.runs[0].navigationEndpoint!.watchEndpoint.videoId
            const name = col0.musicResponsiveListItemFlexColumnRenderer.text.runs[0].text

            const videoType = col0.musicResponsiveListItemFlexColumnRenderer.text.runs[0].navigationEndpoint!.watchEndpoint.watchEndpointMusicSupportedConfigs.watchEndpointMusicConfig.musicVideoType
            const isVideo = videoType !== 'MUSIC_VIDEO_TYPE_ATV'

            const thumbnailUrl = isVideo ? undefined : cleanThumbnailUrl(item.musicResponsiveListItemRenderer.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails[0].url)
            const duration = timestampToSeconds(item.musicResponsiveListItemRenderer.fixedColumns[0].musicResponsiveListItemFixedColumnRenderer.text.runs[0].text)

            const col2run = col2.musicResponsiveListItemFlexColumnRenderer.text.runs?.[0]
            const album: Song['album'] = col2run ? { id: col2run.navigationEndpoint.browseEndpoint.browseId, name: col2run.text } : undefined

            let artists: { id?: string; name: string }[] | undefined = [],
                uploader: { id?: string; name: string } | undefined

            for (const run of col1.musicResponsiveListItemFlexColumnRenderer.text.runs) {
                const pageType = run.navigationEndpoint?.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType
                const runData = { id: run.navigationEndpoint?.browseEndpoint.browseId, name: run.text }

                pageType === 'MUSIC_PAGE_TYPE_ARTIST' ? artists.push(runData) : (uploader = runData)
            }

            if (artists.length === 0) artists = undefined

            return { id, name, duration, thumbnailUrl, artists, album, uploader, isVideo }
        })

        const dividedItems = []
        for (let i = 0; i < scrapedItems.length; i += 50) dividedItems.push(scrapedItems.slice(i, i + 50))

        const access_token = await this.accessToken
        const videoSchemaMap = new Map<string, youtube_v3.Schema$Video>()
        const videoSchemas = (await Promise.all(dividedItems.map((chunk) => ytDataApi.videos.list({ part: ['snippet'], id: chunk.map((item) => item.id), access_token })))).map((response) => response.data.items!).flat()
        videoSchemas.forEach((schema) => videoSchemaMap.set(schema.id!, schema))

        const connection = { id: this.id, type: 'youtube-music' } satisfies Song['connection']
        return scrapedItems.map((item) => {
            const correspondingSchema = videoSchemaMap.get(item.id)!
            const { id, name, duration, album, isVideo } = item
            const existingThumbnail = item.thumbnailUrl
            const artists = item.artists?.map((artist) => ({ id: artist.id ?? correspondingSchema.snippet?.channelId!, name: artist.name }))
            const uploader = item.uploader ? { id: item.uploader?.id ?? correspondingSchema.snippet?.channelId!, name: item.uploader.name } : undefined

            const videoThumbnails = correspondingSchema.snippet?.thumbnails!

            const thumbnailUrl = existingThumbnail ?? videoThumbnails.maxres?.url ?? videoThumbnails.standard?.url ?? videoThumbnails.high?.url ?? videoThumbnails.medium?.url ?? videoThumbnails.default?.url!
            const releaseDate = new Date(correspondingSchema.snippet?.description?.match(/Released on: \d{4}-\d{2}-\d{2}/)?.[0] ?? correspondingSchema.snippet?.publishedAt!).toISOString()

            return { connection, id, name, type: 'song', duration, thumbnailUrl, releaseDate, artists, album, uploader, isVideo } satisfies Song
        })
    }

    private async scrapedToMediaItems<T extends (InnerTube.ScrapedSong | InnerTube.ScrapedAlbum | InnerTube.ScrapedArtist | InnerTube.ScrapedPlaylist)[]>(scrapedItems: T): Promise<ScrapedMediaItemMap<T[number]>[]> {
        const songIds = new Set<string>(),
            albumIds = new Set<string>(),
            playlistIds = new Set<string>()

        scrapedItems.forEach((item) => {
            switch (item.type) {
                case 'song':
                    songIds.add(item.id)
                    if (item.album?.id && !item.album.name) albumIds.add(item.album.id) // This is here because sometimes it is not possible to get the album name directly from a page, only the id
                    break
                case 'album':
                    albumIds.add(item.id)
                    break
                case 'playlist':
                    playlistIds.add(item.id)
                    break
            }
        })

        const songIdArray = Array.from(songIds)
        const dividedIds: string[][] = []
        for (let i = 0; i < songIdArray.length; i += 50) dividedIds.push(songIdArray.slice(i, i + 50))

        const access_token = await this.accessToken

        const getSongDetails = () =>
            Promise.all(dividedIds.map((idsChunk) => ytDataApi.videos.list({ part: ['snippet', 'contentDetails'], id: idsChunk, access_token }))).then((responses) =>
                responses.map((response) => response.data.items!).flat(),
            )
        // Oh FFS. Despite nothing documenting it ^this api can only query a maximum of 50 ids at a time. Addtionally, if you exceed that limit, it doesn't even give you the correct error, it says some nonsense about an invalid filter paramerter. FML.
        const getAlbumDetails = () => Promise.all(Array.from(albumIds).map((id) => this.getAlbum(id)))
        const getPlaylistDetails = () => Promise.all(Array.from(playlistIds).map((id) => this.getPlaylist(id)))

        const [songDetails, albumDetails, playlistDetails] = await Promise.all([getSongDetails(), getAlbumDetails(), getPlaylistDetails()])
        const songDetailsMap = new Map<string, youtube_v3.Schema$Video>(),
            albumDetailsMap = new Map<string, Album>(),
            playlistDetailsMap = new Map<string, Playlist>()

        songDetails.forEach((item) => songDetailsMap.set(item.id!, item))
        albumDetails.forEach((album) => albumDetailsMap.set(album.id, album))
        playlistDetails.forEach((playlist) => playlistDetailsMap.set(playlist.id, playlist))

        const connection = { id: this.id, type: 'youtube-music' } satisfies (Song | Album | Artist | Playlist)['connection']

        return scrapedItems.map((item) => {
            switch (item.type) {
                case 'song':
                    const { id, name, artists, isVideo, uploader } = item
                    const songDetails = songDetailsMap.get(id)!
                    const duration = secondsFromISO8601(songDetails.contentDetails?.duration!)

                    const thumbnails = songDetails.snippet?.thumbnails!
                    const thumbnailUrl = item.thumbnailUrl ?? thumbnails.maxres?.url ?? thumbnails.standard?.url ?? thumbnails.high?.url ?? thumbnails.medium?.url ?? thumbnails.default?.url!

                    const releaseDate = new Date(songDetails.snippet?.description?.match(/Released on: \d{4}-\d{2}-\d{2}/)?.[0] ?? songDetails.snippet?.publishedAt!).toISOString()

                    let album: Song['album']
                    if (item.album?.id) {
                        const albumName = item.album.name ? item.album.name : albumDetailsMap.get(item.album.id)!.name
                        album = { id: item.album.id, name: albumName }
                    }

                    return { connection, id, name, type: 'song', duration, thumbnailUrl, releaseDate, artists, album, isVideo, uploader } satisfies Song
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
        const isVideo = rowContent.navigationEndpoint.watchEndpoint.watchEndpointMusicSupportedConfigs.watchEndpointMusicConfig.musicVideoType !== 'MUSIC_VIDEO_TYPE_ATV'
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
        default:
            throw Error('Unexpected twoRowItem type: ' + pageType)
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
        const id = listContent.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].navigationEndpoint.watchEndpoint?.videoId
        if (!id) throw TypeError('Encountered a bad responsiveListItemRenderer, potentially and "Episode or something like that"') // ! I need to rework all my parsers to be able to handle these kinds of edge cases

        const isVideo =
            listContent.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].navigationEndpoint.watchEndpoint.watchEndpointMusicSupportedConfigs.watchEndpointMusicConfig.musicVideoType !==
            'MUSIC_VIDEO_TYPE_ATV'
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
        default:
            throw Error('Unexpected responsiveListItem type: ' + pageType)
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
        const isVideo = navigationEndpoint.watchEndpoint.watchEndpointMusicSupportedConfigs.watchEndpointMusicConfig.musicVideoType !== 'MUSIC_VIDEO_TYPE_ATV'
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
        default:
            throw Error('Unexpected musicCardShelf type: ' + pageType)
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

// * This method is designed to parse the cookies returned from a yt response in the Set-Cookie headers.
// * Keeping it here in case I ever need to implement management of a user's youtube cookies
function parseAndSetCookies(response: Response) {
    const setCookieHeaders = response.headers.getSetCookie().map((header) => {
        const keyValueStrings = header.split('; ')
        const [name, value] = keyValueStrings[0].split('=')
        const result: Record<string, string | number | boolean> = { name, value }
        keyValueStrings.slice(1).forEach((string) => {
            const [key, value] = string.split('=')
            switch (key.toLowerCase()) {
                case 'domain':
                    result.domain = value
                    break
                case 'max-age':
                    result.expirationDate = Date.now() / 1000 + Number(value)
                    break
                case 'expires':
                    result.expirationDate = result.expirationDate ? new Date(value).getTime() / 1000 : result.expirationDate // Max-Age takes precedence
                    break
                case 'path':
                    result.path = value
                    break
                case 'secure':
                    result.secure = true
                    break
                case 'httponly':
                    result.httpOnly = true
                    break
                case 'samesite':
                    const lowercaseValue = value.toLowerCase()
                    result.sameSite = lowercaseValue === 'none' ? 'no_restriction' : lowercaseValue
                    break
            }
        })
        console.log(JSON.stringify(result))
        return result
    })
}

// ? Helpfull Docummentation:
// ?  - Making requests to the youtube player: https://tyrrrz.me/blog/reverse-engineering-youtube-revisited (Oleksii Holub, https://github.com/Tyrrrz)
// ?  - YouTube API Clients: https://github.com/zerodytrash/YouTube-Internal-Clients (https://github.com/zerodytrash)

// ? Video Test ids:
// ?  - DJ Sharpnel Blue Army full ver: iyL0zueK4CY (Standard video; 144p, 240p)
// ?  - HELLOHELL: p0qace56glE (Music video type ATV; Premium Exclusive)
// ?  - The Stampy Channel - Endless Episodes - 🔴 Rebroadcast: S8s3eRBPCX0 (Live stream; 144p, 240p, 360p, 480p, 720p, 1080p)
