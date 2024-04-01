import { google } from 'googleapis'
import { DB } from './db'
import { PUBLIC_YOUTUBE_API_CLIENT_ID } from '$env/static/public'
import { YOUTUBE_API_CLIENT_SECRET } from '$env/static/private'

export class YouTubeMusic implements Connection {
    public id: string
    private userId: string
    private ytUserId: string
    private tokens: YouTubeMusic.Tokens

    constructor(id: string, userId: string, youtubeUserId: string, tokens: YouTubeMusic.Tokens) {
        this.id = id
        this.userId = userId
        this.ytUserId = youtubeUserId
        this.tokens = tokens
    }

    private BASEHEADERS = {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0',
        accept: '*/*',
        'accept-encoding': 'gzip, deflate',
        'content-type': 'application/json',
        'content-encoding': 'gzip',
        origin: 'https://music.youtube.com',
        Cookie: 'SOCS=CAI;',
    }

    private getTokens = async (): Promise<YouTubeMusic.Tokens> => {
        if (this.tokens.expiry < Date.now()) {
            const refreshToken = this.tokens.refreshToken

            const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                body: JSON.stringify({
                    client_id: PUBLIC_YOUTUBE_API_CLIENT_ID,
                    client_secret: YOUTUBE_API_CLIENT_SECRET,
                    refresh_token: refreshToken,
                    grant_type: 'refresh_token',
                }),
            })

            const { access_token, expires_in } = await response.json()
            const newExpiry = Date.now() + expires_in * 1000

            const newTokens: YouTubeMusic.Tokens = { accessToken: access_token, refreshToken, expiry: newExpiry }
            DB.updateTokens(this.id, newTokens)
            this.tokens = newTokens
        }

        return this.tokens
    }

    public getConnectionInfo = async (): Promise<Extract<ConnectionInfo, { type: 'youtube-music' }>> => {
        const youtube = google.youtube('v3')
        const userChannelResponse = await youtube.channels.list({ mine: true, part: ['snippet'], access_token: (await this.getTokens()).accessToken })
        const userChannel = userChannelResponse.data.items![0]

        return {
            id: this.id,
            userId: this.userId,
            type: 'youtube-music',
            serviceInfo: {
                userId: this.ytUserId,
                username: userChannel.snippet?.title as string,
                profilePicture: userChannel.snippet?.thumbnails?.default?.url as string | undefined,
            },
            tokens: await this.getTokens(),
        }
    }

    public getRecommendations = async (): Promise<(Song | Album | Playlist)[]> => {
        const { listenAgain, quickPicks } = await this.getHome()
        return listenAgain.concat(quickPicks)
    }

    public search = async (searchTerm: string, filter?: 'song' | 'album' | 'artist' | 'playlist'): Promise<(Song | Album | Artist | Playlist)[]> => {
        const headers = Object.assign(this.BASEHEADERS, { authorization: `Bearer ${(await this.getTokens()).accessToken}`, 'X-Goog-Request-Time': `${Date.now()}` })

        // Figure out how to handle Library and Uploads
        // Depending on how I want to handle the playlist & library sync feature

        const searchParams = {
            song: 'EgWKAQIIAWoMEA4QChADEAQQCRAF',
            album: 'EgWKAQIYAWoMEA4QChADEAQQCRAF',
            artist: 'EgWKAQIgAWoMEA4QChADEAQQCRAF',
            playlist: 'Eg-KAQwIABAAGAAgACgBMABqChAEEAMQCRAFEAo%3D',
        }

        const searchResulsts: InnerTube.SearchResponse = await fetch(`https://music.youtube.com/youtubei/v1/search`, {
            headers,
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
        console.log(JSON.stringify(searchResulsts))

        const contents = searchResulsts.contents.tabbedSearchResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents

        const parsedSearchResults: (Song | Album | Artist | Playlist)[] = []

        return []
    }

    private getHome = async (): Promise<YouTubeMusic.HomeItems> => {
        const headers = Object.assign(this.BASEHEADERS, { authorization: `Bearer ${(await this.getTokens()).accessToken}`, 'X-Goog-Request-Time': `${Date.now()}` })

        const response = await fetch(`https://music.youtube.com/youtubei/v1/browse`, {
            headers,
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
        })

        const data: InnerTube.BrowseResponse = await response.json()
        console.log(JSON.stringify(data))
        const contents = data.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents

        const homeItems: YouTubeMusic.HomeItems = {
            listenAgain: [],
            quickPicks: [],
            newReleases: [],
        }

        for (const section of contents) {
            const headerTitle = section.musicCarouselShelfRenderer.header.musicCarouselShelfBasicHeaderRenderer.title.runs[0].text
            const rawContents = section.musicCarouselShelfRenderer.contents

            const parsedContent = rawContents.map((content) =>
                'musicTwoRowItemRenderer' in content ? this.parseTwoRowItemRenderer(content.musicTwoRowItemRenderer) : this.parseResponsiveListItemRenderer(content.musicResponsiveListItemRenderer),
            )

            if (headerTitle === 'Listen again') {
                homeItems.listenAgain = parsedContent
            } else if (headerTitle === 'Quick picks') {
                homeItems.quickPicks = parsedContent
            } else if (headerTitle === 'New releases') {
                homeItems.newReleases = parsedContent
            }
        }

        return homeItems
    }

    private parseTwoRowItemRenderer = (rowContent: InnerTube.musicTwoRowItemRenderer): Song | Album | Artist | Playlist => {
        const connection = { id: this.id, type: 'youtube-music' } satisfies (Song | Album | Artist | Playlist)['connection']
        const name = rowContent.title.runs[0].text

        let artists: (Song | Album)['artists']
        for (const run of rowContent.subtitle.runs) {
            if (!run.navigationEndpoint) continue
            const artist = { id: run.navigationEndpoint.browseEndpoint.browseId, name: run.text }
            artists ? artists.push(artist) : (artists = [artist])
        }

        const thumbnail = refineThumbnailUrl(rowContent.thumbnailRenderer.musicThumbnailRenderer.thumbnail.thumbnails[0].url)

        if ('watchEndpoint' in rowContent.navigationEndpoint) {
            const id = rowContent.navigationEndpoint.watchEndpoint.videoId
            return { connection, id, name, type: 'song', artists, thumbnail } satisfies Song
        }

        const pageType = rowContent.navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType
        const id = rowContent.navigationEndpoint.browseEndpoint.browseId
        switch (pageType) {
            case 'MUSIC_PAGE_TYPE_ALBUM':
                return { connection, id, name, type: 'album', artists, thumbnail } satisfies Album
            case 'MUSIC_PAGE_TYPE_ARTIST':
                return { connection, id, name, type: 'artist', thumbnail } satisfies Artist
            case 'MUSIC_PAGE_TYPE_PLAYLIST':
                return { connection, id, name, type: 'playlist', thumbnail } satisfies Playlist
        }
    }

    private parseResponsiveListItemRenderer = (listContent: InnerTube.musicResponsiveListItemRenderer): Song => {
        const connection = { id: this.id, type: 'youtube-music' } satisfies Song['connection']
        const name = listContent.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].text
        const id = listContent.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].navigationEndpoint.watchEndpoint.videoId

        let artists: Song['artists']
        for (const run of listContent.flexColumns[1].musicResponsiveListItemFlexColumnRenderer.text.runs) {
            if (!run.navigationEndpoint) continue
            const artist = { id: run.navigationEndpoint.browseEndpoint.browseId, name: run.text }
            artists ? artists.push(artist) : (artists = [artist])
        }

        const column2run = listContent.flexColumns[2].musicResponsiveListItemFlexColumnRenderer.text.runs?.[0]
        const pageIsAlbum = column2run?.navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType === 'MUSIC_PAGE_TYPE_ALBUM'
        const album: Song['album'] = pageIsAlbum ? { id: column2run.navigationEndpoint.browseEndpoint.browseId, name: column2run.text } : undefined

        const thumbnail = refineThumbnailUrl(listContent.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails[0].url)

        return { connection, id, name, type: 'song', artists, album, thumbnail } satisfies Song
    }

    private parseMusicCardShelfRenderer = (cardContent: InnerTube.musicCardShelfRenderer): Song | Album | Artist | Playlist => {
        const connection = { id: this.id, type: 'youtube-music' } satisfies (Song | Album | Artist | Playlist)['connection']
        const name = cardContent.title.runs[0].text
        const thumbnail = refineThumbnailUrl(cardContent.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails[0].url)

        let album: Song['album'], artists: (Song | Album)['artists']
        for (const run of cardContent.subtitle.runs) {
            if (!run.navigationEndpoint) continue

            const pageType = run.navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType
            if (pageType === 'MUSIC_PAGE_TYPE_ARTIST') {
                const artist = { id: run.navigationEndpoint.browseEndpoint.browseId, name: run.text }
                artists ? artists.push(artist) : (artists = [artist])
            } else if (pageType === 'MUSIC_PAGE_TYPE_ALBUM') {
                album = { id: run.navigationEndpoint.browseEndpoint.browseId, name: run.text }
            }
        }

        const navigationEndpoint = cardContent.title.runs[0].navigationEndpoint
        if ('watchEndpoint' in navigationEndpoint) {
            const id = navigationEndpoint.watchEndpoint.videoId
            return { connection, id, name, type: 'song', artists, album, thumbnail } satisfies Song
        }

        const pageType = navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType
        const id = navigationEndpoint.browseEndpoint.browseId
        switch (pageType) {
            case 'MUSIC_PAGE_TYPE_ALBUM':
                return { connection, id, name, type: 'album', artists, thumbnail } satisfies Album
            case 'MUSIC_PAGE_TYPE_ARTIST':
                return { connection, id, name, type: 'artist', thumbnail } satisfies Artist
            case 'MUSIC_PAGE_TYPE_PLAYLIST':
                return { connection, id, name, type: 'playlist', thumbnail } satisfies Playlist
        }
    }
}

const refineThumbnailUrl = (urlString: string): string => {
    const url = new URL(urlString)
    if (url.origin === 'https://i.ytimg.com') {
        return urlString.slice(0, urlString.indexOf('?')).replace('sddefault', 'mqdefault')
    } else if (url.origin === 'https://lh3.googleusercontent.com' || url.origin === 'https://yt3.googleusercontent.com' || url.origin === 'https://yt3.ggpht.com') {
        return urlString.slice(0, urlString.indexOf('='))
    } else {
        console.error(urlString)
        throw new Error('Invalid thumbnail url origin')
    }
}

const formatDate = (): string => {
    const currentDate = new Date()
    const year = currentDate.getUTCFullYear()
    const month = (currentDate.getUTCMonth() + 1).toString().padStart(2, '0') // Months are zero-based, so add 1
    const day = currentDate.getUTCDate().toString().padStart(2, '0')

    return year + month + day
}

declare namespace InnerTube {
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
        contents?: Array<{
            musicResponsiveListItemRenderer: musicResponsiveListItemRenderer
        }>
        thumbnail: {
            musicThumbnailRenderer: musicThumbnailRenderer
        }
    }

    type musicShelfRenderer = {
        title: {
            runs: Array<{
                text: 'Artists' | 'Songs' | 'Videos' | 'Albums' | 'Community playlists' | 'Podcasts' | 'Episodes' | 'Profiles'
            }>
        }
        contents: Array<{
            musicResponsiveListItemRenderer: musicResponsiveListItemRenderer
        }>
    }

    interface BrowseResponse {
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
                            text: string // 'Listen again' | 'Forgotten favorites' | 'Quick picks'
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
    }

    type musicResponsiveListItemRenderer = {
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
                                navigationEndpoint: {
                                    browseEndpoint: browseEndpoint
                                }
                            },
                        ]
                    }
                }
            },
        ]
        playlistItemData: {
            videoId: string
        }
    }

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
                pageType: 'MUSIC_PAGE_TYPE_ALBUM' | 'MUSIC_PAGE_TYPE_ARTIST' | 'MUSIC_PAGE_TYPE_PLAYLIST'
            }
        }
    }

    type watchEndpoint = {
        videoId: string
        playlistId: string
        watchEndpointMusicSupportedConfigs: {
            watchEndpointMusicConfig: {
                musicVideoType: 'MUSIC_VIDEO_TYPE_UGC' | 'MUSIC_VIDEO_TYPE_ATV'
            }
        }
    }
}
