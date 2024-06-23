import { youtube, type youtube_v3 } from 'googleapis/build/src/apis/youtube'
import { PUBLIC_YOUTUBE_API_CLIENT_ID } from '$env/static/public'
import { YOUTUBE_API_CLIENT_SECRET } from '$env/static/private'
import type { InnerTube } from './youtube-music-types'
import { DB } from './db'

const ytDataApi = youtube('v3') // TODO: At some point I want to ditch this package and just make the API calls directly. Fewer dependecies

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
    | {
          type: 'queue'
          videoIds: string[]
      }

// TODO: Throughout this method, whenever I extract the duration of a video I might want to subtract 1, the actual duration appears to always be one second less than what the duration lists.
export class YouTubeMusic implements Connection {
    public readonly id: string
    private readonly userId: string
    private readonly youtubeUserId: string

    private readonly requestManager: YTRequestManager
    private libraryManager?: YTLibaryManager

    constructor(id: string, userId: string, youtubeUserId: string, accessToken: string, refreshToken: string, expiry: number) {
        this.id = id
        this.userId = userId
        this.youtubeUserId = youtubeUserId

        this.requestManager = new YTRequestManager(id, accessToken, refreshToken, expiry)
    }

    public get library() {
        if (!this.libraryManager) this.libraryManager = new YTLibaryManager(this.id, this.youtubeUserId, this.requestManager)

        return this.libraryManager
    }

    public async getConnectionInfo() {
        const access_token = await this.requestManager.accessToken.catch(() => null)

        let username: string | undefined, profilePicture: string | undefined
        if (access_token) {
            const userChannelResponse = await ytDataApi.channels.list({ mine: true, part: ['snippet'], access_token })
            const userChannel = userChannelResponse?.data.items?.[0]
            username = userChannel?.snippet?.title ?? undefined
            profilePicture = userChannel?.snippet?.thumbnails?.default?.url ?? undefined
        }

        return {
            id: this.id,
            userId: this.userId,
            type: 'youtube-music',
            youtubeUserId: this.youtubeUserId,
            username,
            profilePicture,
        } satisfies ConnectionInfo
    }

    // TODO: Figure out why this still breaks sometimes (Figured out one cause: "Episodes" can appear as videos)
    public async search(searchTerm: string, filter: 'song'): Promise<Song[]>
    public async search(searchTerm: string, filter: 'album'): Promise<Album[]>
    public async search(searchTerm: string, filter: 'artist'): Promise<Artist[]>
    public async search(searchTerm: string, filter: 'playlist'): Promise<Playlist[]>
    public async search(searchTerm: string, filter?: undefined): Promise<(Song | Album | Artist | Playlist)[]>
    public async search(searchTerm: string, filter?: 'song' | 'album' | 'artist' | 'playlist'): Promise<(Song | Album | Artist | Playlist)[]> {
        return [] // ! Need to completely rework this method

        // const searchResulsts = (await this.requestManager.innerTubeFetch({ type: 'search', searchTerm, filter }).then((response) => response.json())) as InnerTube.SearchResponse
    }

    // TODO: Figure out why this still breaks sometimes (Figured out one cause: "Episodes" can appear as videos)
    public async getRecommendations() {
        console.time()
        await this.getAlbumItems('MPREb_zu9EUJqrg8V').then((songs) => console.log(JSON.stringify(songs)))
        console.timeEnd()

        return [] // ! Need to completely rework this method

        // const homeResponse = (await this.requestManager.innerTubeFetch({ type: 'browse', browseId: 'FEmusic_home' }).then((response) => response.json())) as InnerTube.HomeResponse
    }

    // TODO: Move to innerTubeFetch method
    public async getAudioStream(id: string, headers: Headers) {
        if (!isValidVideoId(id)) throw TypeError('Invalid youtube video Id')

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
                authorization: `Bearer ${await this.requestManager.accessToken}`, // * Including the access token is what enables access to premium content for some reason
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

        return fetch(hqAudioFormat.url, { headers, keepalive: true })
    }

    /**
     * @param id The browseId of the album
     */
    public async getAlbum(id: string): Promise<Album> {
        const albumResponse = await this.requestManager
            .innerTubeFetch('/browse', { body: { browseId: id } })
            .then((response) => response.json() as Promise<InnerTube.Album.AlbumResponse | InnerTube.Album.ErrorResponse>)
            .catch(() => null)

        if (!albumResponse) throw Error(`Failed to fetch album ${id} of connection ${this.id}`)

        if ('error' in albumResponse) {
            if (albumResponse.error.status === 'NOT_FOUND' || albumResponse.error.status === 'INVALID_ARGUMENT') throw TypeError('Invalid youtube album id')

            const errorMessage = `Unknown playlist response error: ${albumResponse.error.message}`
            console.error(errorMessage)
            throw Error(errorMessage)
        }

        const header = albumResponse.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].musicResponsiveHeaderRenderer

        const connection = { id: this.id, type: 'youtube-music' } satisfies Album['connection']
        const name = header.title.runs[0].text,
            thumbnailUrl = extractLargestThumbnailUrl(header.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails)

        const artistMap = new Map<string, { name: string; profilePicture?: string }>()
        header.straplineTextOne.runs.forEach((run, index) => {
            if (run.navigationEndpoint) {
                const profilePicture = index === 0 && header.straplineThumbnail ? extractLargestThumbnailUrl(header.straplineThumbnail.musicThumbnailRenderer.thumbnail.thumbnails) : undefined
                artistMap.set(run.navigationEndpoint.browseEndpoint.browseId, { name: run.text, profilePicture })
            }
        })

        const artists: Album['artists'] = artistMap.size > 0 ? Array.from(artistMap, (artist) => ({ id: artist[0], name: artist[1].name, profilePicture: artist[1].profilePicture })) : 'Various Artists'

        const releaseYear = header.subtitle.runs.at(-1)?.text!

        return { connection, id, name, type: 'album', thumbnailUrl, artists, releaseYear } satisfies Album
    }

    /**
     * @param id The browseId of the album
     */
    public async getAlbumItems(id: string): Promise<Song[]> {
        const albumResponse = await this.requestManager
            .innerTubeFetch('/browse', { body: { browseId: id } })
            .then((response) => response.json() as Promise<InnerTube.Album.AlbumResponse | InnerTube.Album.ErrorResponse>)
            .catch(() => null)

        if (!albumResponse) throw Error(`Failed to fetch album ${id} of connection ${this.id}`)

        if ('error' in albumResponse) {
            if (albumResponse.error.status === 'NOT_FOUND' || albumResponse.error.status === 'INVALID_ARGUMENT') throw TypeError('Invalid youtube album id')

            const errorMessage = `Unknown playlist response error: ${albumResponse.error.message}`
            console.error(errorMessage)
            throw Error(errorMessage)
        }

        const header = albumResponse.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].musicResponsiveHeaderRenderer

        const contents = albumResponse.contents.twoColumnBrowseResultsRenderer.secondaryContents.sectionListRenderer.contents[0].musicShelfRenderer.contents
        let continuation = albumResponse.contents.twoColumnBrowseResultsRenderer.secondaryContents.sectionListRenderer.continuations?.[0].nextContinuationData.continuation

        const connection = { id: this.id, type: 'youtube-music' } satisfies Song['connection']
        const thumbnailUrl = extractLargestThumbnailUrl(header.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails)
        const album: Song['album'] = { id, name: header.title.runs[0].text }

        const artistMap = new Map<string, { name: string; profilePicture?: string }>()
        header.straplineTextOne.runs.forEach((run, index) => {
            if (run.navigationEndpoint) {
                const profilePicture = index === 0 && header.straplineThumbnail ? extractLargestThumbnailUrl(header.straplineThumbnail.musicThumbnailRenderer.thumbnail.thumbnails) : undefined
                artistMap.set(run.navigationEndpoint.browseEndpoint.browseId, { name: run.text, profilePicture })
            }
        })

        const albumArtists = Array.from(artistMap, (artist) => ({ id: artist[0], name: artist[1].name, profilePicture: artist[1].profilePicture }))

        while (continuation) {
            const continuationResponse = await this.requestManager
                .innerTubeFetch(`/browse?ctoken=${continuation}&continuation=${continuation}`)
                .then((response) => response.json() as Promise<InnerTube.Album.ContinuationResponse>)
                .catch(() => null)

            if (!continuationResponse) throw Error(`Failed to fetch album ${id} of connection ${this.id}`)

            contents.push(...continuationResponse.continuationContents.musicShelfRenderer.contents)
            continuation = continuationResponse.continuationContents.musicShelfRenderer.continuations?.[0].nextContinuationData.continuation
        }

        // Just putting this here in the event that for some reason an album has non-playlable items, never seen it happen but couldn't hurt
        const playableItems = contents.filter((item) => item.musicResponsiveListItemRenderer.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].navigationEndpoint?.watchEndpoint?.videoId !== undefined)

        const dividedItems = []
        for (let i = 0; i < playableItems.length; i += 50) dividedItems.push(playableItems.slice(i, i + 50))

        const access_token = await this.requestManager.accessToken
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

        const videoChannelMap = new Map<string, { id: string; name: string }>()
        videoSchemas.forEach((video) => videoChannelMap.set(video.id!, { id: video.snippet?.channelId!, name: video.snippet?.channelTitle! }))

        return playableItems.map((item) => {
            const [col0, col1] = item.musicResponsiveListItemRenderer.flexColumns

            const id = col0.musicResponsiveListItemFlexColumnRenderer.text.runs[0].navigationEndpoint.watchEndpoint.videoId
            const name = col0.musicResponsiveListItemFlexColumnRenderer.text.runs[0].text

            const videoType = col0.musicResponsiveListItemFlexColumnRenderer.text.runs[0].navigationEndpoint.watchEndpoint.watchEndpointMusicSupportedConfigs.watchEndpointMusicConfig.musicVideoType
            const isVideo = videoType !== 'MUSIC_VIDEO_TYPE_ATV'

            const duration = timestampToSeconds(item.musicResponsiveListItemRenderer.fixedColumns[0].musicResponsiveListItemFixedColumnRenderer.text.runs[0].text)

            let artists: Song['artists']
            if (!col1.musicResponsiveListItemFlexColumnRenderer.text.runs) {
                artists = albumArtists
            } else {
                col1.musicResponsiveListItemFlexColumnRenderer.text.runs.forEach((run) => {
                    if (run.navigationEndpoint) {
                        const artist = { id: run.navigationEndpoint.browseEndpoint.browseId, name: run.text }
                        artists ? artists.push(artist) : (artists = [artist])
                    }
                })
            }

            const uploader: Song['uploader'] = artists ? undefined : videoChannelMap.get(id)!

            return { connection, id, name, type: 'song', duration, thumbnailUrl, releaseDate, artists, album, uploader, isVideo }
        })
    }

    /**
     * @param id The id of the playlist (not the browseId!).
     */
    public async getPlaylist(id: string): Promise<Playlist> {
        const playlistResponse = await this.requestManager
            .innerTubeFetch('/browse', { body: { browseId: 'VL'.concat(id) } })
            .then((response) => response.json() as Promise<InnerTube.Playlist.Response | InnerTube.Playlist.ErrorResponse>)
            .catch(() => null)

        if (!playlistResponse) throw Error(`Failed to fetch playlist ${id} of connection ${this.id}`)

        if ('error' in playlistResponse) {
            if (playlistResponse.error.status === 'NOT_FOUND' || playlistResponse.error.status === 'INVALID_ARGUMENT') throw TypeError('Invalid youtube playlist id')

            const errorMessage = `Unknown playlist response error: ${playlistResponse.error.message}`
            console.error(errorMessage)
            throw Error(errorMessage)
        }

        const header =
            'musicEditablePlaylistDetailHeaderRenderer' in playlistResponse.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0]
                ? playlistResponse.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].musicEditablePlaylistDetailHeaderRenderer.header.musicResponsiveHeaderRenderer
                : playlistResponse.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].musicResponsiveHeaderRenderer

        const connection = { id: this.id, type: 'youtube-music' } satisfies Playlist['connection']
        const name = header.title.runs[0].text

        const thumbnailUrl = extractLargestThumbnailUrl(header.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails)

        const createdBy: Playlist['createdBy'] =
            header.straplineTextOne.runs[0].navigationEndpoint?.browseEndpoint.browseId !== undefined
                ? {
                      id: header.straplineTextOne.runs[0].navigationEndpoint.browseEndpoint.browseId,
                      name: header.straplineTextOne.runs[0].text,
                      profilePicture: header.straplineThumbnail ? extractLargestThumbnailUrl(header.straplineThumbnail.musicThumbnailRenderer.thumbnail.thumbnails) : undefined,
                  }
                : undefined

        return { connection, id, name, type: 'playlist', thumbnailUrl, createdBy } satisfies Playlist
    }

    /**
     * @param id The id of the playlist (not the browseId!).
     * @param startIndex The index to start at (0 based). All playlist items with a lower index will be dropped from the results
     * @param limit The maximum number of playlist items to return
     */
    public async getPlaylistItems(id: string, options?: { startIndex?: number; limit?: number }): Promise<Song[]> {
        const startIndex = options?.startIndex,
            limit = options?.limit

        const playlistResponse = await this.requestManager
            .innerTubeFetch('/browse', { body: { browseId: 'VL'.concat(id) } })
            .then((response) => response.json() as Promise<InnerTube.Playlist.Response | InnerTube.Playlist.ErrorResponse>)
            .catch(() => null)

        if (!playlistResponse) throw Error(`Failed to fetch playlist ${id} of connection ${this.id}`)

        if ('error' in playlistResponse) {
            if (playlistResponse.error.status === 'NOT_FOUND' || playlistResponse.error.status === 'INVALID_ARGUMENT') throw TypeError('Invalid youtube playlist id')

            const errorMessage = `Unknown playlist items response error: ${playlistResponse.error.message}`
            console.error(errorMessage)
            throw Error(errorMessage)
        }

        const playableContents = playlistResponse.contents.twoColumnBrowseResultsRenderer.secondaryContents.sectionListRenderer.contents[0].musicPlaylistShelfRenderer.contents.filter(
            (item) => item.musicResponsiveListItemRenderer.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].navigationEndpoint?.watchEndpoint?.videoId !== undefined,
        )

        let continuation = playlistResponse.contents.twoColumnBrowseResultsRenderer.secondaryContents.sectionListRenderer.contents[0].musicPlaylistShelfRenderer.continuations?.[0].nextContinuationData.continuation

        while (continuation && (!limit || playableContents.length < (startIndex ?? 0) + limit)) {
            const continuationResponse = await this.requestManager
                .innerTubeFetch(`/browse?ctoken=${continuation}&continuation=${continuation}`)
                .then((response) => response.json() as Promise<InnerTube.Playlist.ContinuationResponse>)
                .catch(() => null)

            if (!continuationResponse) throw Error(`Failed to fetch playlist ${id} of connection ${this.id}`)

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

            const thumbnailUrl = isVideo ? undefined : extractLargestThumbnailUrl(item.musicResponsiveListItemRenderer.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails)
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

        const access_token = await this.requestManager.accessToken
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

    /**
     * @param ids An array of youtube video ids.
     * @throws Error if the fetch failed. TypeError if an invalid videoId was included in the request.
     */
    // ? So far don't know if there is a cap for how many you can request a once. My entire 247 song J-core playlist worked in one request no problem.
    // ? The only thing this method is really missing is release dates, which would be the easiest thing to get from the v3 API, but I'm struggling to
    // ? justify making those requests just for the release date. Maybe I can justify it if I find other data in the v3 API that would be useful.
    public async getSongs(ids: string[]): Promise<Song[]> {
        if (ids.some((id) => !isValidVideoId(id))) throw TypeError('Invalid video id in request')

        const response = await this.requestManager
            .innerTubeFetch('/queue', { body: { videoIds: ids } })
            .then((response) => response.json() as Promise<InnerTube.Queue.Response | InnerTube.Queue.ErrorResponse>)
            .catch(() => null)

        if (!response) throw Error(`Failed to fetch ${ids.length} songs from connection ${this.id}`)

        if ('error' in response) {
            if (response.error.status === 'NOT_FOUND') throw TypeError('Invalid video id in request')

            const errorMessage = `Unknown playlist items response error: ${response.error.message}`
            console.error(errorMessage, response.error.status, response.error.code)
            throw Error(errorMessage)
        }

        return response.queueDatas.map((item) => {
            // ? When the song has both a video and auto-generated version, currently I have it set to choose the 'counterpart' auto-generated version as they usually have more complete data,
            // ? as well as the benefit of scalable thumbnails. However, In the event the video versions actually do provide something of value, maybe scrape both.
            const itemData =
                'playlistPanelVideoRenderer' in item.content ? item.content.playlistPanelVideoRenderer : item.content.playlistPanelVideoWrapperRenderer.counterpart[0].counterpartRenderer.playlistPanelVideoRenderer
            const connection = { id: this.id, type: 'youtube-music' } satisfies Song['connection']
            const id = itemData.videoId
            const name = itemData.title.runs[0].text
            const duration = timestampToSeconds(itemData.lengthText.runs[0].text)
            const thumbnailUrl = extractLargestThumbnailUrl(itemData.thumbnail.thumbnails)

            const artists: Song['artists'] = []
            let album: Song['album']
            let uploader: Song['uploader']
            itemData.longBylineText.runs.forEach((run) => {
                if (!run.navigationEndpoint) return

                const pageType = run.navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType
                const runDetails = { id: run.navigationEndpoint.browseEndpoint.browseId, name: run.text }
                if (pageType === 'MUSIC_PAGE_TYPE_ALBUM') {
                    album = runDetails
                } else if (pageType === 'MUSIC_PAGE_TYPE_ARTIST') {
                    artists.push(runDetails)
                } else {
                    uploader = runDetails
                }
            })

            const isVideo = itemData.navigationEndpoint.watchEndpoint.watchEndpointMusicSupportedConfigs.watchEndpointMusicConfig.musicVideoType !== 'MUSIC_VIDEO_TYPE_ATV'

            return { connection, id, name, type: 'song', duration, thumbnailUrl, artists: artists.length > 0 ? artists : undefined, album, uploader, isVideo } satisfies Song
        })
    }
}

class YTRequestManager {
    private readonly connectionId: string
    private currentAccessToken: string
    private readonly refreshToken: string
    private expiry: number

    private readonly searchFilterParams = {
        song: 'EgWKAQIIAWoMEA4QChADEAQQCRAF',
        album: 'EgWKAQIYAWoMEA4QChADEAQQCRAF',
        artist: 'EgWKAQIgAWoMEA4QChADEAQQCRAF',
        playlist: 'Eg-KAQwIABAAGAAgACgBMABqChAEEAMQCRAFEAo%3D',
    } as const

    constructor(connectionId: string, accessToken: string, refreshToken: string, expiry: number) {
        this.connectionId = connectionId
        this.currentAccessToken = accessToken
        this.refreshToken = refreshToken
        this.expiry = expiry
    }

    private accessTokenRefreshRequest: Promise<string> | null = null
    public get accessToken() {
        const refreshAccessToken = async () => {
            const MAX_TRIES = 3
            let tries = 0
            const refreshDetails = {
                client_id: PUBLIC_YOUTUBE_API_CLIENT_ID,
                client_secret: YOUTUBE_API_CLIENT_SECRET,
                refresh_token: this.refreshToken,
                grant_type: 'refresh_token',
            }

            while (tries < MAX_TRIES) {
                ++tries
                const response = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    body: JSON.stringify(refreshDetails),
                }).catch(() => null)
                if (!response || !response.ok) continue

                const { access_token, expires_in } = await response.json()
                const expiry = Date.now() + expires_in * 1000
                return { accessToken: access_token as string, expiry }
            }

            throw Error(`Failed to refresh access tokens for YouTube Music connection: ${this.connectionId}`)
        }

        if (this.expiry > Date.now()) return new Promise<string>((resolve) => resolve(this.currentAccessToken))

        if (this.accessTokenRefreshRequest) return this.accessTokenRefreshRequest

        this.accessTokenRefreshRequest = refreshAccessToken()
            .then(async ({ accessToken, expiry }) => {
                await DB.connections.where('id', this.connectionId).update({ accessToken, expiry })
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

    public async innerTubeFetch(relativeRefrence: string, options?: { body?: Record<string, unknown> }) {
        const url = new URL(relativeRefrence, 'https://music.youtube.com/youtubei/v1/')

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

        const body = Object.assign({ context }, options?.body)

        return fetch(url, { headers, method: 'POST', body: JSON.stringify(body) })
    }
}

class YTLibaryManager {
    private readonly connectionId: string
    private readonly requestManager: YTRequestManager
    private readonly youtubeUserId: string

    constructor(connectionId: string, youtubeUserId: string, requestManager: YTRequestManager) {
        this.connectionId = connectionId
        this.requestManager = requestManager
        this.youtubeUserId = youtubeUserId
    }

    public async albums(): Promise<Album[]> {
        const albumData = await this.requestManager.innerTubeFetch('/browse', { body: { browseId: 'FEmusic_liked_albums' } }).then((response) => response.json() as Promise<InnerTube.Library.AlbumResponse>)

        const { items, continuations } = albumData.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].gridRenderer
        let continuation = continuations?.[0].nextContinuationData.continuation

        while (continuation) {
            const continuationData = await this.requestManager
                .innerTubeFetch(`/browse?ctoken=${continuation}&continuation=${continuation}`)
                .then((response) => response.json() as Promise<InnerTube.Library.AlbumContinuationResponse>)

            items.push(...continuationData.continuationContents.gridContinuation.items)
            continuation = continuationData.continuationContents.gridContinuation.continuations?.[0].nextContinuationData.continuation
        }

        const connection = { id: this.connectionId, type: 'youtube-music' } satisfies Album['connection']
        return items.map((item) => {
            const id = item.musicTwoRowItemRenderer.navigationEndpoint.browseEndpoint.browseId
            const name = item.musicTwoRowItemRenderer.title.runs[0].text
            const thumbnailUrl = extractLargestThumbnailUrl(item.musicTwoRowItemRenderer.thumbnailRenderer.musicThumbnailRenderer.thumbnail.thumbnails)

            let artists: Album['artists'] = []
            item.musicTwoRowItemRenderer.subtitle.runs.forEach((run) => {
                if (run.text === 'Various Artists') return (artists = 'Various Artists')
                if (run.navigationEndpoint && artists instanceof Array) artists.push({ id: run.navigationEndpoint.browseEndpoint.browseId, name: run.text })
            })

            const releaseYear = item.musicTwoRowItemRenderer.subtitle.runs.at(-1)?.text!

            return { connection, id, name, type: 'album', thumbnailUrl, artists, releaseYear } satisfies Album
        })
    }

    public async artists(): Promise<Artist[]> {
        const artistsData = await this.requestManager
            .innerTubeFetch('/browse', { body: { browseId: 'FEmusic_library_corpus_track_artists' } })
            .then((response) => response.json() as Promise<InnerTube.Library.ArtistResponse>)

        const { contents, continuations } = artistsData.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].musicShelfRenderer
        let continuation = continuations?.[0].nextContinuationData.continuation

        while (continuation) {
            const continuationData = await this.requestManager
                .innerTubeFetch(`/browse?ctoken=${continuation}&continuation=${continuation}`)
                .then((response) => response.json() as Promise<InnerTube.Library.ArtistContinuationResponse>)

            contents.push(...continuationData.continuationContents.musicShelfContinuation.contents)
            continuation = continuationData.continuationContents.musicShelfContinuation.continuations?.[0].nextContinuationData.continuation
        }

        const connection = { id: this.connectionId, type: 'youtube-music' } satisfies Album['connection']
        return contents.map((item) => {
            const id = item.musicResponsiveListItemRenderer.navigationEndpoint.browseEndpoint.browseId
            const name = item.musicResponsiveListItemRenderer.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].text
            const profilePicture = extractLargestThumbnailUrl(item.musicResponsiveListItemRenderer.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails)

            return { connection, id, name, type: 'artist', profilePicture } satisfies Artist
        })
    }

    public async playlists(): Promise<Playlist[]> {
        const playlistData = await this.requestManager.innerTubeFetch('/browse', { body: { browseId: 'FEmusic_liked_playlists' } }).then((response) => response.json() as Promise<InnerTube.Library.PlaylistResponse>)

        const { items, continuations } = playlistData.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].gridRenderer
        let continuation = continuations?.[0].nextContinuationData.continuation

        while (continuation) {
            const continuationData = await this.requestManager
                .innerTubeFetch(`/browse?ctoken=${continuation}&continuation=${continuation}`)
                .then((response) => response.json() as Promise<InnerTube.Library.PlaylistContinuationResponse>)

            items.push(...continuationData.continuationContents.gridContinuation.items)
            continuation = continuationData.continuationContents.gridContinuation.continuations?.[0].nextContinuationData.continuation
        }

        const playlists = items.filter(
            (item): item is { musicTwoRowItemRenderer: InnerTube.Library.PlaylistMusicTwoRowItemRenderer } =>
                'browseEndpoint' in item.musicTwoRowItemRenderer.navigationEndpoint &&
                item.musicTwoRowItemRenderer.navigationEndpoint.browseEndpoint.browseId !== 'VLLM' &&
                item.musicTwoRowItemRenderer.navigationEndpoint.browseEndpoint.browseId !== 'VLSE',
        )

        const connection = { id: this.connectionId, type: 'youtube-music' } satisfies Album['connection']
        return playlists.map((item) => {
            const id = item.musicTwoRowItemRenderer.navigationEndpoint.browseEndpoint.browseId.slice(2)
            const name = item.musicTwoRowItemRenderer.title.runs[0].text
            const thumbnailUrl = extractLargestThumbnailUrl(item.musicTwoRowItemRenderer.thumbnailRenderer.musicThumbnailRenderer.thumbnail.thumbnails)

            let createdBy: Playlist['createdBy']
            item.musicTwoRowItemRenderer.subtitle.runs.forEach((run) => {
                if (run.navigationEndpoint && run.navigationEndpoint.browseEndpoint.browseId !== this.youtubeUserId) createdBy = { id: run.navigationEndpoint.browseEndpoint.browseId, name: run.text }
            })

            return { connection, id, name, type: 'playlist', thumbnailUrl, createdBy } satisfies Playlist
        })
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
 * - https://www.gstatic.com - Static images (e.g. a placeholder artist profile picture)
 * - https://i.ytimg.com - Video Thumbnails
 *
 * NOTE:
 * https://i.ytimg.com corresponds to videos, which follow the mqdefault...maxres resolutions scale. It is generally bad practice to use these as there is no way to scale them with query params, and there is no way to tell if a maxres.jpg exists or not.
 * It is generally best practice to not directly scrape these video thumbnails directly from youtube and insted get the highest res from the v3 api.
 * However there a few instances in which we want to scrape a thumbail directly from the webapp (e.g. Playlist thumbanils) so it still remains valid.
 */
function extractLargestThumbnailUrl(thumbnails: Array<{ url: string; width: number; height: number }>): string {
    const bestThumbnailURL = thumbnails.reduce((prev, current) => (prev.width * prev.height > current.width * current.height ? prev : current)).url
    if (!URL.canParse(bestThumbnailURL)) throw new Error('Invalid thumbnail url')

    switch (new URL(bestThumbnailURL).origin) {
        case 'https://lh3.googleusercontent.com':
        case 'https://yt3.googleusercontent.com':
        case 'https://yt3.ggpht.com':
            return bestThumbnailURL.slice(0, bestThumbnailURL.indexOf('='))
        case 'https://music.youtube.com':
            return bestThumbnailURL
        case 'https://www.gstatic.com':
        case 'https://i.ytimg.com':
            return bestThumbnailURL.slice(0, bestThumbnailURL.indexOf('?'))
        default:
            console.error('Tried to clean invalid url: ' + bestThumbnailURL)
            throw new Error('Invalid thumbnail url origin')
    }
}

/**
 * @param timestamp A string in the format Hours:Minutes:Seconds (Standard Timestamp format on YouTube)
 * @returns The total duration of that timestamp in seconds
 */
function timestampToSeconds(timestamp: string): number {
    return timestamp
        .split(':')
        .reverse()
        .reduce((accumulator, current, index) => (accumulator += Number(current) * 60 ** index), 0)
}

function isValidVideoId(id: string): boolean {
    return /^[a-zA-Z0-9-_]{11}$/.test(id)
}

// ? Helpfull Docummentation:
// ?  - Making requests to the youtube player: https://tyrrrz.me/blog/reverse-engineering-youtube-revisited (Oleksii Holub, https://github.com/Tyrrrz)
// ?  - YouTube API Clients: https://github.com/zerodytrash/YouTube-Internal-Clients (https://github.com/zerodytrash)

// ? Video Test ids:
// ?  - DJ Sharpnel Blue Army full ver: iyL0zueK4CY (Standard video; 144p, 240p)
// ?  - HELLOHELL: p0qace56glE (Music video type ATV; Premium Exclusive)
// ?  - The Stampy Channel - Endless Episodes - 🔴 Rebroadcast: S8s3eRBPCX0 (Live stream; 144p, 240p, 360p, 480p, 720p, 1080p)

// * Thoughs about how to handle VIDEO:
// The isVideo property of Song Objects pertains to whether that specific song entity is a video or auto-generated song.
// It says nothing about whehter or not that song has a video or auto-generated counterpart. Because in many situations
// it is not possible to identify if a scraped song even has a video or auto-generated counterpart, I think it is not a good
// approach to try to store that information in the song object. I need to find a simple way to identify which versions a
// song has though. Ideally that information is known before the song gets played.
