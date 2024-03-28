import { google } from 'googleapis'
import { DB } from './db'
import { PUBLIC_YOUTUBE_API_CLIENT_ID } from '$env/static/public'
import { YOUTUBE_API_CLIENT_SECRET } from '$env/static/private'

export class YouTubeMusic implements Connection {
    private id: string
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

    public search = async (searchTerm: string): Promise<(Song | Album | Playlist)[]> => {
        const headers = Object.assign(this.BASEHEADERS, { authorization: `Bearer ${(await this.getTokens()).accessToken}`, 'X-Goog-Request-Time': `${Date.now()}` })

        const response = await fetch(`https://music.youtube.com/youtubei/v1/search`, {
            headers,
            method: 'POST',
            body: JSON.stringify({
                query: searchTerm,
                context: {
                    client: {
                        clientName: 'WEB_REMIX',
                        clientVersion: `1.${formatDate()}.01.00`,
                        hl: 'en',
                    },
                },
            }),
        })

        const data = await response.json()
        console.log(JSON.stringify(data))
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
        const contents = data.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents

        const homeItems: YouTubeMusic.HomeItems = {
            listenAgain: [],
            quickPicks: [],
            newReleases: [],
        }

        for (const section of contents) {
            const headerTitle = section.musicCarouselShelfRenderer.header.musicCarouselShelfBasicHeaderRenderer.title.runs[0].text
            const rawContents = section.musicCarouselShelfRenderer.contents

            const parsedContent: (Song | Album | Playlist)[] =
                'musicTwoRowItemRenderer' in rawContents[0]
                    ? this.parseTwoRowItemRenderer((rawContents as { musicTwoRowItemRenderer: InnerTube.musicTwoRowItemRenderer }[]).map((item) => item.musicTwoRowItemRenderer))
                    : this.parseResponsiveListItemRenderer((rawContents as { musicResponsiveListItemRenderer: InnerTube.musicResponsiveListItemRenderer }[]).map((item) => item.musicResponsiveListItemRenderer))

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

    private parseTwoRowItemRenderer = (rowContent: InnerTube.musicTwoRowItemRenderer[]): (Song | Album | Playlist)[] => {
        const parsedContent: (Song | Album | Playlist)[] = []
        for (const data of rowContent) {
            const title = data.title.runs[0].text
            const subtitles = data.subtitle.runs
            const artists: Song['artists'] | Album['artists'] = []
            for (const subtitle of subtitles) {
                if (subtitle.navigationEndpoint && 'browseEndpoint' in subtitle.navigationEndpoint) {
                    artists.push({ id: subtitle.navigationEndpoint.browseEndpoint.browseId, name: subtitle.text })
                }
            }

            if ('browseEndpoint' in data.navigationEndpoint && data.navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType === 'MUSIC_PAGE_TYPE_ALBUM') {
                const album: Album = {
                    connection: {
                        id: this.id,
                        type: 'youtube-music',
                    },
                    type: 'album',
                    id: data.navigationEndpoint.browseEndpoint.browseId,
                    name: title,
                    thumbnail: refineThumbnailUrl(data.thumbnailRenderer.musicThumbnailRenderer.thumbnail.thumbnails[0].url),
                }
                if (artists.length > 0) album.artists = artists
                parsedContent.push(album)
            } else if ('watchEndpoint' in data.navigationEndpoint) {
                const song: Song = {
                    connection: {
                        id: this.id,
                        type: 'youtube-music',
                    },
                    type: 'song',
                    id: data.navigationEndpoint.watchEndpoint.videoId,
                    name: title,
                    thumbnail: refineThumbnailUrl(data.thumbnailRenderer.musicThumbnailRenderer.thumbnail.thumbnails[0].url),
                }
                if (artists.length > 0) song.artists = artists
                parsedContent.push(song)
            }
        }

        return parsedContent
    }

    private parseResponsiveListItemRenderer = (listContent: InnerTube.musicResponsiveListItemRenderer[]): Song[] => {
        const parsedContent: Song[] = []
        for (const data of listContent) {
            const title = data.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].text,
                id = (data.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].navigationEndpoint! as { watchEndpoint: InnerTube.watchEndpoint }).watchEndpoint.videoId

            const artists: Song['artists'] = []
            for (const run of data.flexColumns[1].musicResponsiveListItemFlexColumnRenderer.text.runs) {
                if ('navigationEndpoint' in run && 'browseEndpoint' in run.navigationEndpoint!) {
                    artists.push({ id: run.navigationEndpoint.browseEndpoint.browseId, name: run.text })
                }
            }

            const thumbnail = refineThumbnailUrl(data.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails[0].url)

            const song: Song = {
                connection: {
                    id: this.id,
                    type: 'youtube-music',
                },
                type: 'song',
                id,
                name: title,
                thumbnail,
            }

            if (artists.length > 0) song.artists = artists
            // This is like the ONE situation where `text` might not have a run
            if (data.flexColumns[2].musicResponsiveListItemFlexColumnRenderer.text?.runs) {
                song.album = {
                    id: (data.flexColumns[2].musicResponsiveListItemFlexColumnRenderer.text.runs[0].navigationEndpoint! as { browseEndpoint: InnerTube.browseEndpoint }).browseEndpoint.browseId,
                    name: data.flexColumns[2].musicResponsiveListItemFlexColumnRenderer.text.runs[0].text,
                }
            }

            parsedContent.push(song)
        }

        return parsedContent
    }
}

const refineThumbnailUrl = (urlString: string): string => {
    const url = new URL(urlString)
    if (url.origin === 'https://i.ytimg.com') {
        return urlString.slice(0, urlString.indexOf('?')).replace('sddefault', 'mqdefault')
    } else if (url.origin === 'https://lh3.googleusercontent.com' || url.origin === 'https://yt3.googleusercontent.com' || url.origin === 'https://yt3.ggpht.com') {
        return urlString.slice(0, urlString.indexOf('='))
    } else {
        console.log(urlString)
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
    type Response = BrowseResponse | OtherResponse

    interface OtherResponse {
        contents: object
    }

    interface BrowseResponse {
        responseContext: {
            visitorData: string
            serviceTrackingParams: object[]
            maxAgeSeconds: number
        }
        contents: {
            singleColumnBrowseResultsRenderer: {
                tabs: [
                    {
                        tabRenderer: {
                            endpoint: object
                            title: 'Home'
                            selected: boolean
                            content: {
                                sectionListRenderer: {
                                    contents: {
                                        musicCarouselShelfRenderer: musicCarouselShelfRenderer
                                    }[]
                                    continuations: [object]
                                    trackingParams: string
                                    header: {
                                        chipCloudRenderer: object
                                    }
                                }
                            }
                            icon: object
                            tabIdentifier: 'FEmusic_home'
                            trackingParams: string
                        }
                    },
                ]
            }
        }
        trackingParams: string
        maxAgeStoreSeconds: number
        background: {
            musicThumbnailRenderer: {
                thumbnail: object
                thumbnailCrop: string
                thumbnailScale: string
                trackingParams: string
            }
        }
    }

    type musicCarouselShelfRenderer = {
        header: {
            musicCarouselShelfBasicHeaderRenderer: {
                title: {
                    runs: [runs]
                }
                strapline: [runs]
                accessibilityData: accessibilityData
                headerStyle: string
                moreContentButton?: {
                    buttonRenderer: {
                        style: string
                        text: {
                            runs: [runs]
                        }
                        navigationEndpoint: navigationEndpoint
                        trackingParams: string
                        accessibilityData: accessibilityData
                    }
                }
                thumbnail?: musicThumbnailRenderer
                trackingParams: string
            }
        }
        contents:
            | {
                  musicTwoRowItemRenderer: musicTwoRowItemRenderer
              }[]
            | {
                  musicResponsiveListItemRenderer: musicResponsiveListItemRenderer
              }[]
        trackingParams: string
        itemSize: string
    }

    type musicDescriptionShelfRenderer = {
        header: {
            runs: [runs]
        }
        description: {
            runs: [runs]
        }
    }

    type musicTwoRowItemRenderer = {
        thumbnailRenderer: {
            musicThumbnailRenderer: musicThumbnailRenderer
        }
        aspectRatio: string
        title: {
            runs: [runs]
        }
        subtitle: {
            runs: runs[]
        }
        navigationEndpoint: navigationEndpoint
        trackingParams: string
        menu: unknown
        thumbnailOverlay: unknown
    }

    type musicResponsiveListItemRenderer = {
        thumbnail: {
            musicThumbnailRenderer: musicThumbnailRenderer
        }
        overlay: unknown
        flexColumns: {
            musicResponsiveListItemFlexColumnRenderer: {
                text: { runs: [runs] }
            }
        }[]
        menu: unknown
        playlistItemData: {
            videoId: string
        }
    }

    type musicThumbnailRenderer = {
        thumbnail: {
            thumbnails: {
                url: string
                width: number
                height: number
            }[]
        }
        thumbnailCrop: string
        thumbnailScale: string
        trackingParams: string
        accessibilityData?: accessibilityData
        onTap?: navigationEndpoint
        targetId?: string
    }

    type runs = {
        text: string
        navigationEndpoint?: navigationEndpoint
    }

    type navigationEndpoint = {
        clickTrackingParams: string
    } & (
        | {
              browseEndpoint: browseEndpoint
          }
        | {
              watchEndpoint: watchEndpoint
          }
        | {
              watchPlaylistEndpoint: watchPlaylistEndpoint
          }
    )

    type browseEndpoint = {
        browseId: string
        params?: string
        browseEndpointContextSupportedConfigs: {
            browseEndpointContextMusicConfig: {
                pageType: 'MUSIC_PAGE_TYPE_ALBUM' | 'MUSIC_PAGE_TYPE_ARTIST' | 'MUSIC_PAGE_TYPE_PLAYLIST'
            }
        }
    }

    type watchEndpoint = {
        videoId: string
        playlistId: string
        params?: string
        loggingContext: {
            vssLoggingContext: object
        }
        watchEndpointMusicSupportedConfigs: {
            watchEndpointMusicConfig: object
        }
    }

    type watchPlaylistEndpoint = {
        playlistId: string
        params?: string
    }

    type accessibilityData = {
        accessibilityData: {
            label: string
        }
    }
}
