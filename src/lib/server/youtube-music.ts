import { google, type youtube_v3 } from 'googleapis'
import ytdl from 'ytdl-core'
import { DB } from './db'
import { PUBLIC_YOUTUBE_API_CLIENT_ID } from '$env/static/public'
import { YOUTUBE_API_CLIENT_SECRET } from '$env/static/private'

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

        const parsedSearchResults: (InnerTube.Home.ScrapedSong | InnerTube.Home.ScrapedAlbum | InnerTube.Home.ScrapedArtist | InnerTube.Home.ScrapedPlaylist)[] = []
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

        return await this.buildFullProfiles(parsedSearchResults)
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

        const recommendations: (InnerTube.Home.ScrapedSong | InnerTube.Home.ScrapedAlbum | InnerTube.Home.ScrapedArtist | InnerTube.Home.ScrapedPlaylist)[] = []
        const goodSections = ['Listen again', 'Forgotten favorites', 'Quick picks', 'From your library']
        for (const section of contents) {
            const sectionType = section.musicCarouselShelfRenderer.header.musicCarouselShelfBasicHeaderRenderer.title.runs[0].text
            if (!goodSections.includes(sectionType)) continue

            const parsedContent = section.musicCarouselShelfRenderer.contents.map((content) =>
                'musicTwoRowItemRenderer' in content ? parseTwoRowItemRenderer(content.musicTwoRowItemRenderer) : parseResponsiveListItemRenderer(content.musicResponsiveListItemRenderer),
            )
            recommendations.push(...parsedContent)
        }

        console.log(JSON.stringify(await google.youtube('v3').playlistItems.list({ part: ['snippet', 'contentDetails'], playlistId: 'PLzs_8-KtyJFiM2zwEFqWqSX_WfzBenR9D', access_token: await this.accessToken })))

        return []

        const fullProfiles = await this.buildFullProfiles(recommendations)
        console.log(JSON.stringify(fullProfiles))

        return fullProfiles
    }

    public async getAudioStream(id: string, range: string | null): Promise<Response> {
        const videoInfo = await ytdl.getInfo(`http://www.youtube.com/watch?v=${id}`)
        const format = ytdl.chooseFormat(videoInfo.formats, { quality: 'highestaudio', filter: 'audioonly' })

        const headers = new Headers({ range: range || '0-' })

        return await fetch(format.url, { headers })
    }

    public async getAlbum(id: string): Promise<Album> {
        const albumResponse: InnerTube.AlbumResponse = await fetch('https://music.youtube.com/youtubei/v1/browse', {
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

    public async getPlaylist(id: string): Promise<Playlist> {
        const playlistResponse: InnerTube.Playlist.PlaylistResponse = await fetch('https://music.youtube.com/youtubei/v1/browse', {
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

        const header =
            'musicEditablePlaylistDetailHeaderRenderer' in playlistResponse.header
                ? playlistResponse.header.musicEditablePlaylistDetailHeaderRenderer.header.musicDetailHeaderRenderer
                : playlistResponse.header.musicDetailHeaderRenderer

        const playlistItems = await this.scrapePlaylistItems(playlistResponse)

        const connection = { id: this.id, type: 'youtube-music' } satisfies Playlist['connection']
        const name = header.title.runs[0].text

        const thumbnailUrl = cleanThumbnailUrl(
            header.thumbnail.croppedSquareThumbnailRenderer.thumbnail.thumbnails.reduce((prev, current) => (prev.width * prev.height > current.width * current.height ? prev : current)).url,
        )

        let createdBy: Playlist['createdBy']
        header.subtitle.runs.forEach((run) => {
            if (run.navigationEndpoint?.browseEndpoint.browseId) createdBy = { id: run.navigationEndpoint.browseEndpoint.browseId, name: run.text }
        })

        const length = playlistItems.length
        const duration = playlistItems.reduce((accumulator, current) => (accumulator += current.duration), 0)

        return { connection, id, name, type: 'playlist', duration, thumbnailUrl, createdBy, length } satisfies Playlist
    }

    // public async getPlaylistItems(playlistId: string, startIndex: number, limit: number): Promise<Song[]> {
    //     const playlistResponse: InnerTube.Playlist.PlaylistResponse = await fetch('https://music.youtube.com/youtubei/v1/browse', {
    //         headers: await this.innertubeRequestHeaders,
    //         method: 'POST',
    //         body: JSON.stringify({
    //             browseId: playlistId,
    //             context: {
    //                 client: {
    //                     clientName: 'WEB_REMIX',
    //                     clientVersion: `1.${formatDate()}.01.00`,
    //                     hl: 'en',
    //                 },
    //             },
    //         }),
    //     }).then((response) => response.json())

    //     const playlistItems = await this.scrapePlaylistItems(playlistResponse)
    //     const fullProfile = await this.buildFullProfiles(playlistItems)
    // }

    private async scrapePlaylistItems(playlistResponse: InnerTube.Playlist.PlaylistResponse): Promise<InnerTube.Playlist.ScrapedPlaylistItem[]> {
        const contents = playlistResponse.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].musicPlaylistShelfRenderer.contents
        let continuation =
            playlistResponse.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].musicPlaylistShelfRenderer.continuations?.[0].nextContinuationData.continuation

        while (continuation) {
            const continuationResponse: InnerTube.Playlist.ContinuationResponse = await fetch(`https://music.youtube.com/youtubei/v1/browse?ctoken=${continuation}&continuation=${continuation}`, {
                headers: await this.innertubeRequestHeaders,
                method: 'POST',
                body: JSON.stringify({
                    context: {
                        client: {
                            clientName: 'WEB_REMIX',
                            clientVersion: `1.${formatDate()}.01.00`,
                            hl: 'en',
                        },
                    },
                }),
            }).then((response) => response.json())

            contents.push(...continuationResponse.continuationContents.musicPlaylistShelfContinuation.contents)
            continuation = continuationResponse.continuationContents.musicPlaylistShelfContinuation.continuations?.[0].nextContinuationData.continuation
        }

        const playlistItems: InnerTube.Playlist.ScrapedPlaylistItem[] = []
        contents.forEach((item) => {
            const [col0, col1, col2] = item.musicResponsiveListItemRenderer.flexColumns

            // This is simply to handle completely fucked playlists where the playlist items might be missing navigation endpoints (e.g. Deleted Videos)
            // or in some really bad cases, have a navigationEndpoint, but not a watchEndpoint somehow (Possibly for unlisted/private content?)
            if (!col0.musicResponsiveListItemFlexColumnRenderer.text.runs[0].navigationEndpoint?.watchEndpoint?.videoId) return

            const id = col0.musicResponsiveListItemFlexColumnRenderer.text.runs[0].navigationEndpoint.watchEndpoint.videoId
            const name = col0.musicResponsiveListItemFlexColumnRenderer.text.runs[0].text
            const duration = timestampToSeconds(item.musicResponsiveListItemRenderer.fixedColumns[0].musicResponsiveListItemFixedColumnRenderer.text.runs[0].text)

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

            playlistItems.push({ id, name, type: 'song', duration, thumbnailUrl, artists, album, uploader, isVideo })
        })

        return playlistItems
    }

    private async buildFullProfiles(
        scrapedItems: (InnerTube.Home.ScrapedSong | InnerTube.Home.ScrapedAlbum | InnerTube.Home.ScrapedArtist | InnerTube.Home.ScrapedPlaylist)[],
    ): Promise<(Song | Album | Artist | Playlist)[]> {
        const connection = { id: this.id, type: 'youtube-music' } satisfies Song['connection']

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

        const yt = google.youtube('v3')
        const access_token = await this.accessToken

        const getSongDetails = () => yt.videos.list({ part: ['snippet', 'contentDetails'], id: Array.from(songIds), access_token })
        const getAlbumDetails = () => Promise.all(Array.from(albumIds).map((id) => this.getAlbum(id)))
        const getPlaylistDetails = () => Promise.all(Array.from(playlistIds).map((id) => this.getPlaylist(id)))

        const [songDetails, albumDetails, playlistDetails] = await Promise.all([getSongDetails(), getAlbumDetails(), getPlaylistDetails()])
        const songDetailsMap = new Map<string, youtube_v3.Schema$Video>(),
            albumDetailsMap = new Map<string, Album>(),
            playlistDetailsMap = new Map<string, Playlist>()

        songDetails.data.items!.forEach((item) => songDetailsMap.set(item.id!, item))
        albumDetails.forEach((album) => albumDetailsMap.set(album.id, album))
        playlistDetails.forEach((playlist) => playlistDetailsMap.set(playlist.id, playlist))

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
                    const fullAlbum = albumDetails ? { id: albumDetails.id, name: albumDetails.name, thumbnailUrl: albumDetails.thumbnailUrl } : (undefined satisfies Song['album'])

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
                    return playlistDetailsMap.get(item.id)!
            }
        })
    }
}

function parseTwoRowItemRenderer(rowContent: InnerTube.musicTwoRowItemRenderer): InnerTube.Home.ScrapedSong | InnerTube.Home.ScrapedAlbum | InnerTube.Home.ScrapedArtist | InnerTube.Home.ScrapedPlaylist {
    const name = rowContent.title.runs[0].text

    let artists: InnerTube.Home.ScrapedSong['artists'] | InnerTube.Home.ScrapedAlbum['artists'] = [],
        creator: InnerTube.Home.ScrapedSong['uploader'] | InnerTube.Home.ScrapedPlaylist['createdBy']

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
        const thumbnailUrl: InnerTube.Home.ScrapedSong['thumbnailUrl'] = isVideo ? undefined : cleanThumbnailUrl(rowContent.thumbnailRenderer.musicThumbnailRenderer.thumbnail.thumbnails[0].url)

        let albumId: string | undefined
        rowContent.menu?.menuRenderer.items.forEach((menuOption) => {
            if (
                'menuNavigationItemRenderer' in menuOption &&
                'browseEndpoint' in menuOption.menuNavigationItemRenderer.navigationEndpoint &&
                menuOption.menuNavigationItemRenderer.navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType === 'MUSIC_PAGE_TYPE_ALBUM'
            )
                albumId = menuOption.menuNavigationItemRenderer.navigationEndpoint.browseEndpoint.browseId
        })

        const album: InnerTube.Home.ScrapedSong['album'] = albumId ? { id: albumId } : undefined

        return { id, name, type: 'song', thumbnailUrl, artists, album, uploader: creator, isVideo } satisfies InnerTube.Home.ScrapedSong
    }

    const pageType = rowContent.navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType
    const id = rowContent.navigationEndpoint.browseEndpoint.browseId

    switch (pageType) {
        case 'MUSIC_PAGE_TYPE_ALBUM':
            const thumbnailUrl = cleanThumbnailUrl(rowContent.thumbnailRenderer.musicThumbnailRenderer.thumbnail.thumbnails[0].url)
            return { id, name, type: 'album', artists, thumbnailUrl } satisfies InnerTube.Home.ScrapedAlbum
        case 'MUSIC_PAGE_TYPE_ARTIST':
        case 'MUSIC_PAGE_TYPE_USER_CHANNEL':
            const profilePicture = cleanThumbnailUrl(rowContent.thumbnailRenderer.musicThumbnailRenderer.thumbnail.thumbnails[0].url)
            return { id, name, type: 'artist', profilePicture } satisfies InnerTube.Home.ScrapedArtist
        case 'MUSIC_PAGE_TYPE_PLAYLIST':
            return { id, name, type: 'playlist', createdBy: creator! } satisfies InnerTube.Home.ScrapedPlaylist
    }
}

function parseResponsiveListItemRenderer(listContent: InnerTube.musicResponsiveListItemRenderer): InnerTube.Home.ScrapedSong | InnerTube.Home.ScrapedAlbum | InnerTube.Home.ScrapedArtist | InnerTube.Home.ScrapedPlaylist {
    const name = listContent.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].text
    const column1Runs = listContent.flexColumns[1].musicResponsiveListItemFlexColumnRenderer.text.runs

    let artists: InnerTube.Home.ScrapedSong['artists'] | InnerTube.Home.ScrapedAlbum['artists'] = [],
        creator: InnerTube.Home.ScrapedSong['uploader'] | InnerTube.Home.ScrapedPlaylist['createdBy']

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

        return { id, name, type: 'song', thumbnailUrl, artists, album, uploader: creator, isVideo } satisfies InnerTube.Home.ScrapedSong
    }

    const id = listContent.navigationEndpoint.browseEndpoint.browseId
    const pageType = listContent.navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType

    switch (pageType) {
        case 'MUSIC_PAGE_TYPE_ALBUM':
            const thumbnailUrl = cleanThumbnailUrl(listContent.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails[0].url)
            return { id, name, type: 'album', thumbnailUrl, artists } satisfies InnerTube.Home.ScrapedAlbum
        case 'MUSIC_PAGE_TYPE_ARTIST':
        case 'MUSIC_PAGE_TYPE_USER_CHANNEL':
            const profilePicture = cleanThumbnailUrl(listContent.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails[0].url)
            return { id, name, type: 'artist', profilePicture } satisfies InnerTube.Home.ScrapedArtist
        case 'MUSIC_PAGE_TYPE_PLAYLIST':
            return { id, name, type: 'playlist', createdBy: creator! } satisfies InnerTube.Home.ScrapedPlaylist
    }
}

function parseMusicCardShelfRenderer(cardContent: InnerTube.musicCardShelfRenderer): InnerTube.Home.ScrapedSong | InnerTube.Home.ScrapedAlbum | InnerTube.Home.ScrapedArtist | InnerTube.Home.ScrapedPlaylist {
    const name = cardContent.title.runs[0].text

    let album: Song['album'],
        artists: InnerTube.Home.ScrapedSong['artists'] | InnerTube.Home.ScrapedAlbum['artists'] = [],
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

        return { id, name, type: 'song', thumbnailUrl, artists, album, uploader: creator, isVideo } satisfies InnerTube.Home.ScrapedSong
    }

    const pageType = navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType
    const id = navigationEndpoint.browseEndpoint.browseId
    switch (pageType) {
        case 'MUSIC_PAGE_TYPE_ALBUM':
            const thumbnailUrl = cleanThumbnailUrl(cardContent.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails[0].url)
            return { id, name, type: 'album', thumbnailUrl, artists } satisfies InnerTube.Home.ScrapedAlbum
        case 'MUSIC_PAGE_TYPE_ARTIST':
        case 'MUSIC_PAGE_TYPE_USER_CHANNEL':
            const profilePicture = cleanThumbnailUrl(cardContent.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails[0].url)
            return { id, name, type: 'artist', profilePicture } satisfies InnerTube.Home.ScrapedArtist
        case 'MUSIC_PAGE_TYPE_PLAYLIST':
            return { id, name, type: 'playlist', createdBy: creator! } satisfies InnerTube.Home.ScrapedPlaylist
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

function formatDate(): string {
    const currentDate = new Date()
    const year = currentDate.getUTCFullYear()
    const month = (currentDate.getUTCMonth() + 1).toString().padStart(2, '0') // Months are zero-based, so add 1
    const day = currentDate.getUTCDate().toString().padStart(2, '0')

    return year + month + day
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

// NOTE 1: Thumbnails
// When scraping thumbnails from the YTMusic browse pages, there are two different types of images that can be returned,
// standard video thumbnais and auto-generated square thumbnails for propper releases. The auto-generated thumbanils we want to
// keep from the scrape because:
// a) They can be easily scaled with ytmusic's weird fake query parameters (Ex: https://baseUrl=h1000)
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

declare namespace InnerTube {
    namespace Home {
        type ScrapedSong = {
            id: string
            name: string
            type: 'song'
            thumbnailUrl?: string
            artists?: {
                id: string
                name: string
            }[]
            album?: {
                id: string
                name?: string
            }
            uploader?: {
                id: string
                name: string
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
                      name: string
                  }[]
                | 'Various Artists'
        }

        type ScrapedArtist = {
            id: string
            name: string
            type: 'artist'
            profilePicture: string
        }

        type ScrapedPlaylist = {
            id: string
            name: string
            type: 'playlist'
            // thumbnailUrl: string Need to figure out how I want to do playlists
            createdBy: {
                id: string
                name: string
            }
        }
    }

    namespace Playlist {
        interface PlaylistResponse {
            contents: {
                singleColumnBrowseResultsRenderer: {
                    tabs: [
                        {
                            tabRenderer: {
                                content: {
                                    sectionListRenderer: {
                                        contents: [
                                            {
                                                musicPlaylistShelfRenderer: ContentShelf
                                            },
                                        ]
                                    }
                                }
                            }
                        },
                    ]
                }
            }
            header:
                | Header
                | {
                      musicEditablePlaylistDetailHeaderRenderer: {
                          header: Header
                      }
                  }
        }

        interface ContinuationResponse {
            continuationContents: {
                musicPlaylistShelfContinuation: ContentShelf
            }
        }

        type ContentShelf = {
            contents: Array<PlaylistItem>
            continuations?: [
                {
                    nextContinuationData: {
                        continuation: string
                    }
                },
            ]
        }

        type PlaylistItem = {
            musicResponsiveListItemRenderer: {
                thumbnail: {
                    musicThumbnailRenderer: musicThumbnailRenderer
                }
                flexColumns: [
                    {
                        musicResponsiveListItemFlexColumnRenderer: {
                            text: {
                                runs: [
                                    {
                                        text: string
                                        navigationEndpoint?: {
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
                                runs: {
                                    text: string
                                    navigationEndpoint?: {
                                        browseEndpoint: browseEndpoint
                                    }
                                }[]
                            }
                        }
                    },
                    {
                        musicResponsiveListItemFlexColumnRenderer: {
                            text: {
                                runs?: [
                                    {
                                        text: string
                                        navigationEndpoint: {
                                            browseEndpoint: browseEndpoint
                                        }
                                    },
                                ]
                            }
                        }
                    },
                ]
                fixedColumns: [
                    {
                        musicResponsiveListItemFixedColumnRenderer: {
                            text: {
                                runs: [
                                    {
                                        text: string
                                    },
                                ]
                            }
                        }
                    },
                ]
            }
        }

        type Header = {
            musicDetailHeaderRenderer: {
                title: {
                    runs: [
                        {
                            text: string
                        },
                    ]
                }
                subtitle: {
                    runs: {
                        text: string
                        navigationEndpoint?: {
                            browseEndpoint: browseEndpoint
                        }
                    }[]
                }
                thumbnail: {
                    croppedSquareThumbnailRenderer: musicThumbnailRenderer
                }
            }
        }

        type ScrapedPlaylistItem = {
            id: string
            name: string
            type: 'song'
            duration: number
            thumbnailUrl?: string
            artists?: {
                id: string
                name: string
            }[]
            album?: {
                id: string
                name: string
            }
            uploader?: {
                id: string
                name: string
            }
            isVideo: boolean
        }
    }

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
                                                        fixedColumns: [
                                                            {
                                                                musicResponsiveListItemFixedColumnRenderer: {
                                                                    text: {
                                                                        runs: [
                                                                            {
                                                                                text: string
                                                                            },
                                                                        ]
                                                                    }
                                                                }
                                                            },
                                                        ]
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
                    // Alright let's break down this dumbass pattern. First run will always have the text 'Album', last will always be the release year. Interspersed throughout the middle will be the artist runs
                    // which, if they have a dedicated channel, will have a navigation endpoint. Every other run is some kind of delimiter (• , &). Because y'know, it's perfectly sensible to include your decorative
                    // elements in your api responses /s
                    runs: Array<{
                        text: string
                        navigationEndpoint?: {
                            browseEndpoint: browseEndpoint
                        }
                    }>
                }
                secondSubtitle: {
                    // Slightly less dumbass. Three runs, first is the number of songs in the format: "# songs". Second is another bullshit delimiter. Last is the album's duration, spelled out rather than as a timestamp
                    // for god knows what reason. Duration follows the following format: "# hours, # minutes" or just "# minutes".
                    runs: {
                        text: string
                    }[]
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
        subtitle: {
            runs: Array<{
                text: string
                navigationEndpoint?: {
                    browseEndpoint: browseEndpoint
                }
            }>
        }
        navigationEndpoint:
            | {
                  watchEndpoint: watchEndpoint
              }
            | {
                  browseEndpoint: browseEndpoint
              }
        menu?: {
            menuRenderer: {
                items: Array<
                    | {
                          menuNavigationItemRenderer: {
                              text: {
                                  runs: [
                                      {
                                          text: 'Go to album' | 'Go to artist'
                                      },
                                  ]
                              }
                              navigationEndpoint:
                                  | {
                                        browseEndpoint: browseEndpoint
                                    }
                                  | {
                                        watchPlaylistEndpoint: unknown
                                    }
                                  | {
                                        addToPlaylistEndpoint: unknown
                                    }
                                  | {
                                        shareEntityEndpoint: unknown
                                    }
                                  | {
                                        watchEndpoint: unknown
                                    }
                          }
                      }
                    | {
                          menuServiceItemRenderer: unknown
                      }
                    | {
                          toggleMenuServiceItemRenderer: unknown
                      }
                >
            }
        }
    }

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
                musicVideoType: 'MUSIC_VIDEO_TYPE_UGC' | 'MUSIC_VIDEO_TYPE_OMV' | 'MUSIC_VIDEO_TYPE_ATV' | 'MUSIC_VIDEO_TYPE_OFFICIAL_SOURCE_MUSIC'
                // UGC and OMV Means it is a user-uploaded video, ATV means it is auto-generated, I don't have a fucking clue what OFFICIAL_SOURCE_MUSIC means but so far it seems like videos too?
            }
        }
    }
}
