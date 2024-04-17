import { google } from 'googleapis'
import ytdl from 'ytdl-core'
import { DB } from './db'
import { PUBLIC_YOUTUBE_API_CLIENT_ID } from '$env/static/public'
import { YOUTUBE_API_CLIENT_SECRET } from '$env/static/private'

export class YouTubeMusic implements Connection {
    public readonly id: string
    private readonly userId: string
    private readonly ytUserId: string
    private accessToken: string
    private readonly refreshToken: string
    private expiry: number

    constructor(id: string, userId: string, youtubeUserId: string, accessToken: string, refreshToken: string, expiry: number) {
        this.id = id
        this.userId = userId
        this.ytUserId = youtubeUserId
        this.accessToken = accessToken
        this.refreshToken = refreshToken
        this.expiry = expiry
    }

    private headers = async () => {
        return new Headers({
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0',
            accept: '*/*',
            'accept-encoding': 'gzip, deflate',
            'content-type': 'application/json',
            'content-encoding': 'gzip',
            origin: 'https://music.youtube.com',
            Cookie: 'SOCS=CAI;',
            authorization: `Bearer ${await this.getAccessToken()}`,
            'X-Goog-Request-Time': `${Date.now()}`,
        })
    }

    private getAccessToken = async (): Promise<string> => {
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
            this.accessToken = accessToken
            this.expiry = expiry
        }

        return this.accessToken
    }

    public getConnectionInfo = async (): Promise<Extract<ConnectionInfo, { type: 'youtube-music' }>> => {
        const youtube = google.youtube('v3')
        const access_token = await this.getAccessToken().catch(() => {
            return null
        })

        let username, profilePicture
        if (access_token) {
            const userChannelResponse = await youtube.channels.list({ mine: true, part: ['snippet'], access_token })
            const userChannel = userChannelResponse?.data.items?.[0]
            username = userChannel?.snippet?.title ?? undefined // ?? undefined will simply ensure that if it is null it get's converted to undefined
            profilePicture = userChannel?.snippet?.thumbnails?.default?.url ?? undefined
        }

        return {
            id: this.id,
            userId: this.userId,
            type: 'youtube-music',
            youtubeUserId: this.ytUserId,
            username,
            profilePicture,
        }
    }

    public search = async (searchTerm: string, filter?: 'song' | 'album' | 'artist' | 'playlist'): Promise<(Song | Album | Artist | Playlist)[]> => {
        // Figure out how to handle Library and Uploads
        // Depending on how I want to handle the playlist & library sync feature

        const searchParams = {
            song: 'EgWKAQIIAWoMEA4QChADEAQQCRAF',
            album: 'EgWKAQIYAWoMEA4QChADEAQQCRAF',
            artist: 'EgWKAQIgAWoMEA4QChADEAQQCRAF',
            playlist: 'Eg-KAQwIABAAGAAgACgBMABqChAEEAMQCRAFEAo%3D',
        }

        const searchResulsts: InnerTube.SearchResponse = await fetch(`https://music.youtube.com/youtubei/v1/search`, {
            headers: await this.headers(),
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

    public getRecommendations = async (): Promise<(Song | Album | Artist | Playlist)[]> => {
        const browseResponse: InnerTube.BrowseResponse = await fetch(`https://music.youtube.com/youtubei/v1/browse`, {
            headers: await this.headers(),
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

        const contents = browseResponse.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents

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

        return recommendations
    }

    public getAudioStream = async (id: string, range: string | null): Promise<Response> => {
        const videoInfo = await ytdl.getInfo(`http://www.youtube.com/watch?v=${id}`)
        const format = ytdl.chooseFormat(videoInfo.formats, { quality: 'highestaudio', filter: 'audioonly' })

        const headers = new Headers({ range: range || '0-' })

        return await fetch(format.url, { headers })
    }
}

const parseTwoRowItemRenderer = (connection: string, rowContent: InnerTube.musicTwoRowItemRenderer): Song | Album | Artist | Playlist => {
    const name = rowContent.title.runs[0].text
    const thumbnail = refineThumbnailUrl(rowContent.thumbnailRenderer.musicThumbnailRenderer.thumbnail.thumbnails[0].url)

    let artists: (Song | Album)['artists'], createdBy: (Song | Playlist)['createdBy']
    for (const run of rowContent.subtitle.runs) {
        if (!run.navigationEndpoint) continue

        const pageType = run.navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType
        if (pageType === 'MUSIC_PAGE_TYPE_ARTIST') {
            const artist = { id: run.navigationEndpoint.browseEndpoint.browseId, name: run.text }
            artists ? artists.push(artist) : (artists = [artist])
        } else if (pageType === 'MUSIC_PAGE_TYPE_USER_CHANNEL') {
            createdBy = { id: run.navigationEndpoint.browseEndpoint.browseId, name: run.text }
        }
    }

    if ('watchEndpoint' in rowContent.navigationEndpoint) {
        const id = rowContent.navigationEndpoint.watchEndpoint.videoId
        return { connection, id, name, type: 'song', artists, createdBy, thumbnail } satisfies Song
    }

    const pageType = rowContent.navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType
    const id = rowContent.navigationEndpoint.browseEndpoint.browseId
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

const parseResponsiveListItemRenderer = (connection: string, listContent: InnerTube.musicResponsiveListItemRenderer): Song | Album | Artist | Playlist => {
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
        if (column2run?.navigationEndpoint && column2run.navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType === 'MUSIC_PAGE_TYPE_ALBUM') {
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

const parseMusicCardShelfRenderer = (connection: string, cardContent: InnerTube.musicCardShelfRenderer): Song | Album | Artist | Playlist => {
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

const refineThumbnailUrl = (urlString: string): string => {
    if (!URL.canParse(urlString)) throw new Error('Invalid thumbnail url')

    const url = new URL(urlString)
    switch (url.origin) {
        case 'https://i.ytimg.com':
            return urlString.slice(0, urlString.indexOf('?')).replace('sddefault', 'mqdefault')
        case 'https://lh3.googleusercontent.com':
        case 'https://yt3.googleusercontent.com':
        case 'https://yt3.ggpht.com':
            return urlString.slice(0, urlString.indexOf('='))
        case 'https://music.youtube.com':
            return urlString
        default:
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
                musicVideoType: 'MUSIC_VIDEO_TYPE_UGC' | 'MUSIC_VIDEO_TYPE_ATV'
            }
        }
    }
}
