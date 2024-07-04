import { PUBLIC_YOUTUBE_API_CLIENT_ID } from '$env/static/public'
import { YOUTUBE_API_CLIENT_SECRET } from '$env/static/private'
import type { InnerTube, YouTubeDataApi } from './youtube-music-types'
import { DB } from './db'
import ky, { type KyInstance } from 'ky'

export class YouTubeMusic implements Connection {
    public readonly id: string
    private readonly userId: string
    private readonly youtubeUserId: string

    private readonly api: APIManager
    private libraryManager?: LibaryManager

    constructor(id: string, userId: string, youtubeUserId: string, accessToken: string, refreshToken: string, expiry: number) {
        this.id = id
        this.userId = userId
        this.youtubeUserId = youtubeUserId

        this.api = new APIManager(id, accessToken, refreshToken, expiry)
    }

    public get library() {
        if (!this.libraryManager) this.libraryManager = new LibaryManager(this.id, this.youtubeUserId, this.api)

        return this.libraryManager
    }

    // * This method can NOT throw an error
    public async getConnectionInfo() {
        const response = await this.api.v1
            .WEB_REMIX('browse', { json: { browseId: this.youtubeUserId } })
            .json<InnerTube.User.Response>()
            .catch(() => null)

        const username = response?.header.musicVisualHeaderRenderer.title.runs[0].text
        const profilePicture = response ? extractLargestThumbnailUrl(response.header.musicVisualHeaderRenderer.foregroundThumbnail.musicThumbnailRenderer.thumbnail.thumbnails) : undefined

        return {
            id: this.id,
            userId: this.userId,
            type: 'youtube-music',
            youtubeUserId: this.youtubeUserId,
            username,
            profilePicture,
        } satisfies ConnectionInfo
    }

    public async search<T extends keyof MediaItemTypeMap>(searchTerm: string, types: Set<T>): Promise<MediaItemTypeMap[T][]> {
        const searchFilterParams = {
            song: 'EgWKAQIIAWoMEA4QChADEAQQCRAF',
            video: 'EgWKAQIQAWoMEA4QChADEAQQCRAF',
            album: 'EgWKAQIYAWoMEA4QChADEAQQCRAF',
            artist: 'EgWKAQIgAWoMEA4QChADEAQQCRAF',
            playlist: 'EgeKAQQoAEABagwQDhAKEAMQBBAJEAU%3D',
        } as const

        const searchType = async (type: keyof typeof searchFilterParams) => this.api.v1.WEB_REMIX('search', { json: { query: searchTerm, params: searchFilterParams[type] } }).json<InnerTube.Search.Response>()

        const extendedTypes = new Set<keyof typeof searchFilterParams>(types)
        if (extendedTypes.has('song')) extendedTypes.add('video')

        const searchResponses = await Promise.all(Array.from(extendedTypes, searchType))

        // Ok so I have a problem here. Firstly, the youtube music flavor of search is fucking abyssmal. You get like at most 3 results for each type of
        // content and most of it is completely irrelavent and not even close to what you search for. On top of that it won't even try to return
        // livestreams or past completed broadcasts. The standard youtube search is far superior however the pain point there is you are either getting
        // a video (which includes livestream content), a channel, or a playlist, which does not line up super well with the current Song, Album, Artist
        // Playlist architecture. For non-livestream videos I could put the results throught the getSongs() method which will scrape the counterparts,
        // but there is really no way to get albums or or determine if a channel is an artist or an uploader. I guess I could query both with filters but
        // the minimum of like five API calls + the parsing just sounds like such an bad time.

        // Now that I think about it, I don't really know how I want to do search. Returning finite results would make my life easier but I think that's
        // just not a good idea. Acutally it seems most streaming services do limit the number of seach results. Only problem is, IDK how I'm supposed to
        // implement a limt query param in the search endpoint when the I'm getting all of the content from many different APIs, *some of which* (fucking yt music),
        // don't provide a way to limit the number of results returned

        // Holy fuck it gets even worse. The v3 API does not even allow you get anything beyond the "snippet" for completed live streams, meaning no duration or high res
        // thumbnails (at most it returns like a 360p). On top of that we can't use the getSongs() method either because it will return an error response (INVALID_ARGUMENT).
        // I think I'm just going to have to bite the bullet query both the YTMusic API and the standard youtube search v1 API.

        // NOTE:
        // To ensure best result we want to make sure we are only getting videos relavent to the search back. Youtube for some reason throws so much bs in their default search results
        // like "For You" and "People also Watched", which is almost never relevant to the actual search. To fix this just include the param EgIQAQ%3D%3D in the body of the request.
        // This way it should only return a list of videos that are relevant to the actual search, including past completed broadcasts and excluding active livestream (which we want).
        // Also, don't try to get playlists from the default search, we want to get those from the YTMusic API so we get those nice 2x2 album art thumbnails

        // Brand new problems. With the standard YT Video search there is no way to determine if the channel that uploaded it is an artist or just an uploader channel.
        // Additionally, ytmusic appears to try to filter results for videos that are music oriented. This does not always work perfectly, especially if you search for something
        // inherently non-musical, but it means that generally results are more likely to be music related than with the standard YT search.

        // Y'know what, I'm just not going to worry about this now.

        const parseSongAndVideoCardShelfRenderer = (card: InnerTube.Search.SongMusicCardShelfRenderer | InnerTube.Search.VideoMusicCardShelfRenderer): Song => {
            const connection = { id: this.id, type: 'youtube-music' } satisfies Song['connection']
            const id = card.title.runs[0].navigationEndpoint.watchEndpoint.videoId
            const name = card.title.runs[0].text
            const isVideo = card.title.runs[0].navigationEndpoint.watchEndpoint.watchEndpointMusicSupportedConfigs.watchEndpointMusicConfig.musicVideoType !== 'MUSIC_VIDEO_TYPE_ATV'
            const duration = timestampToSeconds(card.subtitle.runs.find((run) => /^(\d{1,}:\d{2}:\d{2}|\d{1,2}:\d{2})$/.test(run.text))!.text)
            const thumbnailUrl = extractLargestThumbnailUrl(card.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails)

            let artists: Song['artists'], album: Song['album'], uploader: Song['uploader']
            card.subtitle.runs.forEach((run) => {
                if (!run.navigationEndpoint) return

                const pageType = run.navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType
                const runData = { id: run.navigationEndpoint.browseEndpoint.browseId, name: run.text }
                switch (pageType) {
                    case 'MUSIC_PAGE_TYPE_ALBUM':
                        album = runData
                        break
                    case 'MUSIC_PAGE_TYPE_ARTIST':
                        artists ? artists.push(runData) : (artists = [runData])
                        break
                    case 'MUSIC_PAGE_TYPE_USER_CHANNEL':
                        uploader = runData
                        break
                }
            })

            return { connection, id, name, type: 'song', duration, thumbnailUrl, artists, album, uploader, isVideo }
        }

        // Returns null if the video is not playable or if it is an Episode (not currently supported)
        // ? The videos filter for YTMusic search only returns sddefault images at most. Might just want to scrape the id an then use getSongs()
        const parseSongAndVideoResponsiveListItemRenderer = (
            item: InnerTube.Search.SongMusicResponsiveListItemRenderer | InnerTube.Search.VideoMusicResponsiveListItemRenderer | InnerTube.Search.EpisodeMusicResponsiveListItemRenderer,
        ): Song | null => {
            const connection = { id: this.id, type: 'youtube-music' } satisfies Song['connection']
            const col1 = item.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0]
            const col2runs = item.flexColumns[1].musicResponsiveListItemFlexColumnRenderer.text.runs

            if (!col1.navigationEndpoint || 'browseEndpoint' in col1.navigationEndpoint) return null

            const id = col1.navigationEndpoint.watchEndpoint.videoId
            const name = col1.text
            const isVideo = col1.navigationEndpoint.watchEndpoint.watchEndpointMusicSupportedConfigs.watchEndpointMusicConfig.musicVideoType !== 'MUSIC_VIDEO_TYPE_ATV'
            const duration = timestampToSeconds(col2runs.find((run) => /^(\d{1,}:\d{2}:\d{2}|\d{1,2}:\d{2})$/.test(run.text))!.text)
            const thumbnailUrl = extractLargestThumbnailUrl(item.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails)

            let artists: Song['artists'], album: Song['album'], uploader: Song['uploader']
            col2runs.forEach((run) => {
                if (!run.navigationEndpoint) return

                const pageType = run.navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType
                const runData = { id: run.navigationEndpoint.browseEndpoint.browseId, name: run.text }
                switch (pageType) {
                    case 'MUSIC_PAGE_TYPE_ALBUM':
                        album = runData
                        break
                    case 'MUSIC_PAGE_TYPE_ARTIST':
                        artists ? artists.push(runData) : (artists = [runData])
                        break
                    case 'MUSIC_PAGE_TYPE_USER_CHANNEL':
                        uploader = runData
                        break
                }
            })

            return { connection, id, name, type: 'song', duration, thumbnailUrl, artists, album, uploader, isVideo }
        }

        const parseAlbumCardShelfRenderer = (card: InnerTube.Search.AlbumMusicCardShelfRenderer): Album => {
            const connection = { id: this.id, type: 'youtube-music' } satisfies Album['connection']
            const id = card.title.runs[0].navigationEndpoint.browseEndpoint.browseId
            const name = card.title.runs[0].text
            const thumbnailUrl = extractLargestThumbnailUrl(card.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails)

            let artists: Album['artists'] = 'Various Artists',
                releaseYear: string | undefined

            card.subtitle.runs.forEach((run) => {
                if (run.navigationEndpoint) {
                    const artistData = { id: run.navigationEndpoint.browseEndpoint.browseId, name: run.text }
                    typeof artists === 'string' ? (artists = [artistData]) : artists.push(artistData)
                } else if (/^\d{4}$/.test(run.text)) {
                    releaseYear = run.text
                }
            })

            return { connection, id, name, type: 'album', thumbnailUrl, artists, releaseYear }
        }

        const parseArtistCardShelfRenderer = (card: InnerTube.Search.ArtistMusicCardShelfRenderer): Artist => {
            const connection = { id: this.id, type: 'youtube-music' } satisfies Artist['connection']
            const id = card.title.runs[0].navigationEndpoint.browseEndpoint.browseId
            const name = card.title.runs[0].text
            const profilePicture = extractLargestThumbnailUrl(card.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails)

            return { connection, id, name, type: 'artist', profilePicture }
        }

        const parseAlbumResponsiveListItemRenderer = (item: InnerTube.Search.AlbumMusicResponsiveListItemRenderer): Album => {
            const connection = { id: this.id, type: 'youtube-music' } satisfies Album['connection']
            const id = item.navigationEndpoint.browseEndpoint.browseId
            const name = item.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].text
            const thumbnailUrl = extractLargestThumbnailUrl(item.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails)

            let artists: Album['artists'] = 'Various Artists',
                releaseYear: Album['releaseYear']

            item.flexColumns[1].musicResponsiveListItemFlexColumnRenderer.text.runs.forEach((run) => {
                if (run.navigationEndpoint) {
                    const artistData = { id: run.navigationEndpoint.browseEndpoint.browseId, name: run.text }
                    typeof artists === 'string' ? (artists = [artistData]) : artists.push(artistData)
                } else if (/^\d{4}$/.test(run.text)) {
                    releaseYear = run.text
                }
            })

            return { connection, id, name, type: 'album', thumbnailUrl, artists, releaseYear }
        }

        const parseArtistResponsiveListItemRenderer = (item: InnerTube.Search.ArtistMusicResponsiveListItemRenderer): Artist => {
            const connection = { id: this.id, type: 'youtube-music' } satisfies Artist['connection']
            const id = item.navigationEndpoint.browseEndpoint.browseId
            const name = item.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].text
            const profilePicture = extractLargestThumbnailUrl(item.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails)

            return { connection, id, name, type: 'artist', profilePicture }
        }

        const parseCommunityPlaylistResponsiveListItemRenderer = (item: InnerTube.Search.CommunityPlaylistMusicResponsiveListItemRenderer): Playlist => {
            const connection = { id: this.id, type: 'youtube-music' } satisfies Playlist['connection']
            const id = item.navigationEndpoint.browseEndpoint.browseId
            const name = item.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].text
            const thumbnailUrl = extractLargestThumbnailUrl(item.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails)

            let createdBy: Playlist['createdBy']
            item.flexColumns[1].musicResponsiveListItemFlexColumnRenderer.text.runs.forEach((run) => {
                if (!run.navigationEndpoint) return

                createdBy = { id: run.navigationEndpoint.browseEndpoint.browseId, name: run.text }
            })

            return { connection, id, name, type: 'playlist', thumbnailUrl, createdBy }
        }

        const contents = searchResponses.map((response) => response.contents.tabbedSearchResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents).flat()

        const cardSections = contents.filter((section) => 'musicCardShelfRenderer' in section)
        const shelveSections = contents.filter((section) => 'musicShelfRenderer' in section)

        const extractedItems: (Song | Album | Artist | Playlist)[] = []

        for (const section of cardSections) {
            if ('watchEndpoint' in section.musicCardShelfRenderer.title.runs[0].navigationEndpoint) {
                const card = section.musicCardShelfRenderer as InnerTube.Search.SongMusicCardShelfRenderer | InnerTube.Search.VideoMusicCardShelfRenderer
                extractedItems.push(parseSongAndVideoCardShelfRenderer(card))

                if (!('contents' in card && card.contents)) continue

                const playableContents = card.contents.filter((item) => 'musicResponsiveListItemRenderer' in item)
                const contentSongs = playableContents.map((item) => parseSongAndVideoResponsiveListItemRenderer(item.musicResponsiveListItemRenderer)).filter((song) => song !== null)
                extractedItems.push(...contentSongs)
            } else {
                const sectionType = section.musicCardShelfRenderer.title.runs[0].navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType
                if (sectionType === 'MUSIC_PAGE_TYPE_ALBUM') {
                    const card = section.musicCardShelfRenderer as InnerTube.Search.AlbumMusicCardShelfRenderer
                    extractedItems.push(parseAlbumCardShelfRenderer(card))
                } else {
                    const card = section.musicCardShelfRenderer as InnerTube.Search.ArtistMusicCardShelfRenderer
                    card.contents.forEach((content) => {
                        const song = parseSongAndVideoResponsiveListItemRenderer(content.musicResponsiveListItemRenderer)
                        if (song) extractedItems.push(song)
                    })
                    extractedItems.push(parseArtistCardShelfRenderer(card))
                }
            }
        }

        for (const section of shelveSections) {
            switch (section.musicShelfRenderer.title.runs[0].text) {
                case 'Songs':
                case 'Videos':
                    const songShelf = section.musicShelfRenderer as InnerTube.Search.SongsMusicShelfRenderer | InnerTube.Search.VideosMusicShelfRenderer
                    const songs = songShelf.contents.map((item) => parseSongAndVideoResponsiveListItemRenderer(item.musicResponsiveListItemRenderer)).filter((song) => song !== null)
                    extractedItems.push(...songs)
                    break
                case 'Albums':
                    const albumShelf = section.musicShelfRenderer as InnerTube.Search.AlbumsMusicShelfRenderer
                    const albums = albumShelf.contents.map((item) => parseAlbumResponsiveListItemRenderer(item.musicResponsiveListItemRenderer))
                    extractedItems.push(...albums)
                    break
                case 'Artists':
                    const artistShelf = section.musicShelfRenderer as InnerTube.Search.ArtistsMusicShelfRenderer
                    const artists = artistShelf.contents.map((item) => parseArtistResponsiveListItemRenderer(item.musicResponsiveListItemRenderer))
                    extractedItems.push(...artists)
                    break
                case 'Community playlists':
                    const playlistShelf = section.musicShelfRenderer as InnerTube.Search.CommunityPlaylistsMusicShelfRenderer
                    const playlists = playlistShelf.contents.map((item) => parseCommunityPlaylistResponsiveListItemRenderer(item.musicResponsiveListItemRenderer))
                    extractedItems.push(...playlists)
                    break
            }
        }

        return extractedItems.filter((item): item is MediaItemTypeMap[T] => types.has(item.type as T))
    }

    // ! Need to completely rework this method - Currently returns empty array
    public async getRecommendations() {
        // const response = await this.api.v1.WEB_REMIX('browse', { json: { browseId: 'FEmusic_home' } }).json()
        // console.log(JSON.stringify(response))
        return []
    }

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

        const playerResponse = await this.api.v1.ANDROID_TESTSUITE('player', { json: { videoId: id } }).json<InnerTube.Player.PlayerResponse>()

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
        const albumResponse = await this.api.v1.WEB_REMIX('browse', { json: { browseId: id } }).json<InnerTube.Album.AlbumResponse>()

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
        const albumResponse = await this.api.v1.WEB_REMIX('browse', { json: { browseId: id } }).json<InnerTube.Album.AlbumResponse>()

        const contents = albumResponse.contents.twoColumnBrowseResultsRenderer.secondaryContents.sectionListRenderer.contents[0].musicShelfRenderer.contents
        let continuation = albumResponse.contents.twoColumnBrowseResultsRenderer.secondaryContents.sectionListRenderer.continuations?.[0].nextContinuationData.continuation

        while (continuation) {
            const continuationResponse = await this.api.v1.WEB_REMIX(`browse?ctoken=${continuation}&continuation=${continuation}`).json<InnerTube.Album.ContinuationResponse>()

            contents.push(...continuationResponse.continuationContents.musicShelfRenderer.contents)
            continuation = continuationResponse.continuationContents.musicShelfRenderer.continuations?.[0].nextContinuationData.continuation
        }

        const playableIds = contents.map((item) => item.musicResponsiveListItemRenderer.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].navigationEndpoint.watchEndpoint.videoId)

        return this.getSongs(playableIds)
    }

    /**
     * @param id The id of the playlist (not the browseId!).
     */
    public async getPlaylist(id: string): Promise<Playlist> {
        const playlistResponse = await this.api.v1.WEB_REMIX('browse', { json: { browseId: 'VL'.concat(id) } }).json<InnerTube.Playlist.Response>()

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
        const startIndex = options?.startIndex ?? 0,
            limit = options?.limit ?? Infinity

        const playlistItemSearchParams = new URLSearchParams({
            playlistId: id,
            maxResults: '50',
            part: 'snippet,contentDetails,status',
        })

        const playableItems: YouTubeDataApi.PlaylistItems.Item<'snippet' | 'contentDetails' | 'status'>[] = []
        while (playableItems.length < startIndex + limit) {
            const itemsResponse = await this.api.v3(`playlistItems?${playlistItemSearchParams.toString()}`).json<YouTubeDataApi.PlaylistItems.Response<'snippet' | 'contentDetails' | 'status'>>()

            playableItems.push(...itemsResponse.items.filter((item) => item.status.privacyStatus === 'public' || item.snippet.videoOwnerChannelId === item.snippet.channelId))

            if (!itemsResponse.nextPageToken) break // Reached the end of the playlist, retrieved all items

            playlistItemSearchParams.set('pageToken', itemsResponse.nextPageToken)
        }

        const slicedItems = playableItems.slice(startIndex, startIndex + limit) // Removes over-fetch

        const releaseDateMap = new Map<string, string>()
        slicedItems.forEach((item) =>
            releaseDateMap.set(item.contentDetails.videoId, new Date(item.snippet.description.match(/Released on: \d{4}-\d{2}-\d{2}/)?.[0] ?? item.contentDetails.videoPublishedAt).toISOString()),
        )

        const songs = await this.getSongs(releaseDateMap.keys())
        songs.forEach((song) => (song.releaseDate = releaseDateMap.get(song.id)))

        return songs
    }

    /**
     * @param {Iterable<string>} ids An iterable of youtube video ids. Duplicate ids will be filtered out
     * @returns {Promise<Song[]>} An array of Songs. Unavailable songs/videos will be filtered out.
     */
    public async getSongs(ids: Iterable<string>): Promise<Song[]> {
        const uniqueIds = new Set(ids)

        const response = await this.api.v1.WEB_REMIX('music/get_queue', { json: { videoIds: Array.from(uniqueIds) } }).json<InnerTube.Queue.Response>()

        const items = response.queueDatas
            .map((item) => {
                // If song has both an ATV 'counterpart' and video, this will chose whichever matches the id provided in the request
                if ('playlistPanelVideoRenderer' in item.content) return item.content.playlistPanelVideoRenderer

                const primaryRenderer = item.content.playlistPanelVideoWrapperRenderer.primaryRenderer.playlistPanelVideoRenderer
                if (uniqueIds.has(primaryRenderer.videoId)) return primaryRenderer

                return item.content.playlistPanelVideoWrapperRenderer.counterpart[0].counterpartRenderer.playlistPanelVideoRenderer
            })
            .filter((item) => 'title' in item) // TODO: Add indication that some results were filtered out

        return items.map((item) => {
            const connection = { id: this.id, type: 'youtube-music' } satisfies Song['connection']
            const id = item.videoId
            const name = item.title.runs[0].text
            const duration = timestampToSeconds(item.lengthText.runs[0].text)
            const thumbnailUrl = extractLargestThumbnailUrl(item.thumbnail.thumbnails)

            const artists: Song['artists'] = []
            let album: Song['album']
            let uploader: Song['uploader']
            item.longBylineText.runs.forEach((run) => {
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

            const isVideo = item.navigationEndpoint.watchEndpoint.watchEndpointMusicSupportedConfigs.watchEndpointMusicConfig.musicVideoType !== 'MUSIC_VIDEO_TYPE_ATV'

            return { connection, id, name, type: 'song', duration, thumbnailUrl, artists: artists.length > 0 ? artists : undefined, album, uploader, isVideo } satisfies Song
        })
    }
}

class APIManager {
    private readonly connectionId: string
    private currentAccessToken: string
    private readonly refreshToken: string
    private expiry: number

    public readonly v1: {
        WEB_REMIX: KyInstance
        ANDROID_TESTSUITE: KyInstance
    }
    public readonly v3: KyInstance

    constructor(connectionId: string, accessToken: string, refreshToken: string, expiry: number) {
        this.connectionId = connectionId
        this.currentAccessToken = accessToken
        this.refreshToken = refreshToken
        this.expiry = expiry

        const authHook = async (request: Request) => request.headers.set('authorization', `Bearer ${await this.accessToken}`)

        const baseV1 = ky.create({
            prefixUrl: 'https://music.youtube.com/youtubei/v1/',
            method: 'post',
            hooks: { beforeRequest: [authHook] },
        })

        const WEB_REMIX = baseV1.extend({
            json: {
                context: {
                    client: {
                        clientName: 'WEB_REMIX',
                        get clientVersion() {
                            const currentDate = new Date()
                            const year = currentDate.getUTCFullYear().toString()
                            const month = (currentDate.getUTCMonth() + 1).toString().padStart(2, '0') // Months are zero-based, so add 1
                            const day = currentDate.getUTCDate().toString().padStart(2, '0')

                            return `1.${year + month + day}.01.00`
                        },
                    },
                },
            },
        })

        const ANDROID_TESTSUITE = baseV1.extend({
            json: {
                context: {
                    client: {
                        clientName: 'ANDROID_TESTSUITE',
                        clientVersion: '1.9',
                    },
                },
            },
        })

        this.v1 = { WEB_REMIX, ANDROID_TESTSUITE }

        this.v3 = ky.create({
            prefixUrl: 'https://www.googleapis.com/youtube/v3/',
            hooks: { beforeRequest: [authHook] },
        })
    }

    private accessTokenRefreshRequest: Promise<string> | null = null
    private get accessToken() {
        const refreshAccessToken = async () => {
            const refreshDetails = {
                client_id: PUBLIC_YOUTUBE_API_CLIENT_ID,
                client_secret: YOUTUBE_API_CLIENT_SECRET,
                refresh_token: this.refreshToken,
                grant_type: 'refresh_token',
            }

            const { access_token, expires_in } = await ky.post('https://oauth2.googleapis.com/token', { json: refreshDetails, retry: 3 }).json<{ access_token: string; expires_in: number }>()

            const expiry = Date.now() + expires_in * 1000
            return { accessToken: access_token, expiry }
        }

        // ? Maybe build in a buffer to prevent a token expiring while a request is in flight
        if (this.expiry >= Date.now()) return new Promise<string>((resolve) => resolve(this.currentAccessToken))

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
}

class LibaryManager {
    private readonly connectionId: string
    private readonly api: APIManager
    private readonly youtubeUserId: string

    constructor(connectionId: string, youtubeUserId: string, apiManager: APIManager) {
        this.connectionId = connectionId
        this.api = apiManager
        this.youtubeUserId = youtubeUserId
    }

    public async albums(): Promise<Album[]> {
        const albumData = await this.api.v1.WEB_REMIX('browse', { json: { browseId: 'FEmusic_liked_albums' } }).json<InnerTube.Library.AlbumResponse>()

        const { items, continuations } = albumData.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].gridRenderer
        let continuation = continuations?.[0].nextContinuationData.continuation

        while (continuation) {
            const continuationData = await this.api.v1.WEB_REMIX(`browse?ctoken=${continuation}&continuation=${continuation}`).json<InnerTube.Library.AlbumContinuationResponse>()

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
        const artistsData = await this.api.v1.WEB_REMIX('browse', { json: { browseId: 'FEmusic_library_corpus_track_artists' } }).json<InnerTube.Library.ArtistResponse>()

        const { contents, continuations } = artistsData.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].musicShelfRenderer
        let continuation = continuations?.[0].nextContinuationData.continuation

        while (continuation) {
            const continuationData = await this.api.v1.WEB_REMIX(`browse?ctoken=${continuation}&continuation=${continuation}`).json<InnerTube.Library.ArtistContinuationResponse>()

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
        const playlistData = await this.api.v1.WEB_REMIX('browse', { json: { browseId: 'FEmusic_liked_playlists' } }).json<InnerTube.Library.PlaylistResponse>()

        const { items, continuations } = playlistData.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].gridRenderer
        let continuation = continuations?.[0].nextContinuationData.continuation

        while (continuation) {
            const continuationData = await this.api.v1.WEB_REMIX(`browse?ctoken=${continuation}&continuation=${continuation}`).json<InnerTube.Library.PlaylistContinuationResponse>()

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
