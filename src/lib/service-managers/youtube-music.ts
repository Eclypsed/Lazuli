import { google } from 'googleapis'

declare namespace InnerTube {
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
                                    contents:
                                        | {
                                              musicCarouselShelfRenderer: musicCarouselShelfRenderer
                                          }[]
                                        | {
                                              musicDescriptionShelfRenderer: musicDescriptionShelfRenderer
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
                    runs: [runs<'browse'>]
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
                        navigationEndpoint: navigationEndpoint<'browse'>
                        trackingParams: string
                        accessibilityData: accessibilityData
                    }
                }
                thumbnail?: musicThumbnailRenderer
                trackingParams: string
            }
        }
        contents: {
            musicTwoRowItemRenderer?: musicTwoRowItemRenderer
            musicResponsiveListItemRenderer?: unknown
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
            runs: [runs<'browse'>]
        }
        subtitle: {
            runs: runs<'browse'>[]
        }
        navigationEndpoint: navigationEndpoint<endpointType>
        trackingParams: string
        menu: unknown
        thumbnailOverlay: unknown
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
        onTap?: navigationEndpoint<'browse'>
        targetId?: string
    }

    type runs<endpoint extends endpointType | undefined = undefined> = endpoint extends endpointType
        ? {
              text: string
              navigationEndpoint?: navigationEndpoint<endpoint>
          }
        : { text: string }

    type endpointType = 'browse' | 'watch' | 'watchPlaylist'
    type navigationEndpoint<T extends endpointType> = T extends 'browse'
        ? {
              clickTrackingParams: string
              browseEndpoint: {
                  browseId: string
                  params?: string
                  browseEndpointContextSupportedConfigs: {
                      browseEndpointContextMusicConfig: {
                          pageType: 'MUSIC_PAGE_TYPE_ALBUM' | 'MUSIC_PAGE_TYPE_ARTIST' | 'MUSIC_PAGE_TYPE_PLAYLIST'
                      }
                  }
              }
          }
        : T extends 'watch'
          ? {
                clickTrackingParams: string
                watchEndpoint: {
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
            }
          : T extends 'watchPlaylist'
            ? {
                  clickTrackingParams: string
                  watchPlaylistEndpoint: {
                      playlistId: string
                      params?: string
                  }
              }
            : never

    type accessibilityData = {
        accessibilityData: {
            label: string
        }
    }
}

export class YouTubeMusic {
    static baseHeaders = {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0',
        accept: '*/*',
        'accept-encoding': 'gzip, deflate',
        'content-type': 'application/json',
        'content-encoding': 'gzip',
        origin: 'https://music.youtube.com',
        Cookie: 'SOCS=CAI;',
    }

    static fetchServiceInfo = async (userId: string, accessToken: string): Promise<Connection<'youtube-music'>['service']> => {
        const youtube = google.youtube('v3')
        const userChannelResponse = await youtube.channels.list({ mine: true, part: ['snippet'], access_token: accessToken })
        const userChannel = userChannelResponse.data.items![0]

        return {
            userId,
            username: userChannel.snippet?.title as string,
            profilePicture: userChannel.snippet?.thumbnails?.default?.url as string | undefined,
        }
    }

    static getVisitorId = async (accessToken: string): Promise<string> => {
        const headers = Object.assign(this.baseHeaders, { authorization: `Bearer ${accessToken}`, 'X-Goog-Request-Time': `${Date.now()}` })
        const visitorIdResponse = await fetch('https://music.youtube.com', { headers })
        const visitorIdText = await visitorIdResponse.text()
        const regex = /ytcfg\.set\s*\(\s*({.+?})\s*\)\s*;/g
        const matches = []
        let match

        while ((match = regex.exec(visitorIdText)) !== null) {
            const capturedGroup = match[1]
            matches.push(capturedGroup)
        }

        let visitorId = ''
        if (matches.length > 0) {
            const ytcfg = JSON.parse(matches[0])
            visitorId = ytcfg.VISITOR_DATA
        }

        return visitorId
    }

    static getHome = async (accessToken: string) => {
        const headers = Object.assign(this.baseHeaders, { authorization: `Bearer ${accessToken}`, 'X-Goog-Request-Time': `${Date.now()}` })

        function formatDate(): string {
            const currentDate = new Date()
            const year = currentDate.getUTCFullYear()
            const month = (currentDate.getUTCMonth() + 1).toString().padStart(2, '0') // Months are zero-based, so add 1
            const day = currentDate.getUTCDate().toString().padStart(2, '0')

            return year + month + day
        }

        const response = await fetch(`https://music.youtube.com/youtubei/v1/browse?alt=json`, {
            headers,
            method: 'POST',
            body: JSON.stringify({
                browseId: 'FEmusic_home',
                context: {
                    client: {
                        clientName: 'WEB_REMIX',
                        clientVersion: '1.' + formatDate() + '.01.00',
                        hl: 'en',
                    },
                },
            }),
        })

        console.log(response.status)
        const data: InnerTube.BrowseResponse = await response.json()
        const results = data.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents
        const home: any[] = []
        home.push.apply(home, Parsers.parseMixedContent(results))

        // const sectionList = data.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer
        // if ('continuations' in sectionList) {

        // }

        // return home
    }
}

class Parsers {
    static parseMixedContent = (rows: { musicCarouselShelfRenderer: InnerTube.musicCarouselShelfRenderer }[] | { musicDescriptionShelfRenderer: InnerTube.musicDescriptionShelfRenderer }[]) => {
        const items = []
        for (const row of rows) {
            let title: string, contents: string
            if ('musicDescriptionShelfRenderer' in row) {
                const results = row.musicDescriptionShelfRenderer
                title = results.header.runs[0].text
                contents = results.description.runs[0].text
            } else {
                const results = row.musicCarouselShelfRenderer
                if (!('contents' in results)) continue

                title = results.header.musicCarouselShelfBasicHeaderRenderer.title.runs[0].text
                contents = []
                for (const result of results.contents) {
                    let content
                    if (result.musicTwoRowItemRenderer) {
                        const data = result.musicTwoRowItemRenderer
                        const pageType = data.title.runs[0].navigationEndpoint?.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType
                        if (!pageType) {
                            if ('watchPlaylistEndpoint' in data.navigationEndpoint) {
                                content = this.parseWatchPlaylist(data)
                            } else {
                                content = this.parseSong(data)
                            }
                        } else if (pageType === 'MUSIC_PAGE_TYPE_ALBUM') {
                            content = this.parseAlbum(data)
                        } else if (pageType === 'MUSIC_PAGE_TYPE_ARTIST') {
                            content = this.parseRelatedArtist(data)
                        } else if (pageType === 'MUSIC_PAGE_TYPE_PLAYLIST') {
                            content = this.parsePlaylist(data)
                        }
                    } else {
                        const data = result.musicResponsiveListItemRenderer
                        if (!data) continue
                        content = this.parseSongFlat(data)
                    }

                    contents.push(content)
                }
            }

            items.push({ title, contents })
        }

        return items
    }

    static parseSong = (data: InnerTube.musicTwoRowItemRenderer) => {
        const song = {
            title: data.title.runs[0].text,
            videoId: data.navigationEndpoint.watchEndpoint.videoId,
            playlistId: data?.navigationEndpoint?.watchEndpoint?.playlistId,
            thumbnails: data.thumbnailRenderer.musicThumbnailRenderer.thumbnail.thumbnails,
        }
        const fullSong = Object.assign(song, this.parseSongRuns(data.subtitle.runs))
        return fullSong
    }

    static parseSongRuns = (runs: any) => {
        const parsed: Record<string, any> = { artists: [] }
        for (let i = 0; i < runs.length; ++i) {
            if (i % 2) continue

            const run = runs[i],
                text = run.text
            if ('navigationEndpoint' in run) {
                const item = { name: text, id: run?.navigationEndpoint?.browseEndpoint?.browseId }

                if (item.id && (item.id.startsWith('MPRE') || item.id.includes('release_detail'))) {
                    parsed.album = item
                } else {
                    parsed.artists.push(item)
                }
            } else {
                if (/^\d([^ ])* [^ ]*$/.test(text) && i > 0) {
                    parsed.views = text.split(' ')[0]
                } else if (/^(\d+:)*\d+:\d+$/.test(text)) {
                    parsed.duration = text
                    parsed.durationSeconds = this.parseDuration(text)
                } else if (/^\d{4}$/.test(text)) {
                    parsed.year = text
                } else {
                    parsed.artists.push({ name: text, id: null })
                }
            }
        }

        return parsed
    }

    static parseSongFlat = (data: any) => {
        const columns = []
        for (let i = 0; i < data.flexColumns.length; ++i) columns.push(this.getFlexColumnItem(data, i))
        const song: Record<string, any> = {
            title: columns[0].text.runs[0].text,
            videoId: columns[0].text.runs[0]?.navigationEndpoint?.watchEndpoint?.videoId,
            artists: this.parseSongArtists(data, 1),
            thumbnails: data.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails,
            isExplicit: Boolean(data?.badges?.at(0)?.musicInlineBadgeRenderer?.accessibilityData?.accessibilityData?.label),
        }
        if (columns.length > 2 && columns[2] && 'navigationEndpoint' in columns[2].text.runs[0]) {
            song.album = {
                name: columns[2].text.runs[0].text,
                id: columns[2].text.runs[0].navigationEndpoint.browseEndpoint.browseId,
            }
        } else {
            song.views = columns[1].text.runs.at(-1).text.split(' ')[0]
        }

        return song
    }

    static parseAlbum = (data: InnerTube.musicTwoRowItemRenderer) => {
        return {
            title: data.title.runs[0].text,
            type: data.subtitle.runs[0].text,
            year: data.subtitle.runs[2].text,
            artists: Array.from(data.subtitle.runs, (x: any) => {
                if ('navigationEndpoint' in x) return this.parseIdName(x)
            }),
            browseId: data.title.runs[0].navigationEndpoint.browseEndpoint.browseId,
            audioPlaylistId: data?.thumbnailOverlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchPlaylistEndpoint?.playlistId,
            thumbnails: data.thumbnailRenderer.musicThumbnailRenderer.thumbnail.thumbnails,
            isExplicit: Boolean(data?.subtitleBadges?.at(0)?.musicInlineBadgeRenderer.accessibilityData.accessibilityData.label),
        }
    }

    static parseSongArtists = (data: any, index: number) => {
        const flexItem = this.getFlexColumnItem(data, index)
        if (!flexItem) {
            console.log('fired')
            return null
        } else {
            const runs = flexItem.text.runs
            return this.parseSongArtistRuns(runs)
        }
    }

    static parseRelatedArtist = (data: InnerTube.musicTwoRowItemRenderer) => {
        let subscribers = data?.subtitle?.runs[0]?.text
        if (subscribers) subscribers = subscribers.split(' ')[0]
        return {
            title: data.title.runs[0].text,
            browseId: data.title.runs[0].navigationEndpoint.browseEndpoint.browseId,
            subscribers,
            thumbnails: data.thumbnailRenderer.musicThumbnailRenderer.thumbnail.thumbnails,
        }
    }

    static parseSongArtistRuns = (runs: any) => {
        const artists = []
        for (let j = 0; j <= Math.floor(runs.length / 2); j++) {
            artists.push({ name: runs[j * 2].text, id: runs[j * 2]?.navigationEndpoint?.browseEndpoint?.browseId })
        }
        return artists
    }

    static parseDuration = (duration: any) => {
        if (!duration) return duration
        const mappedIncrements = [1, 60, 3600],
            reversedTimes = duration.split(':').reverse()
        const seconds = mappedIncrements.reduce((accumulator, multiplier, index) => {
            return accumulator + multiplier * parseInt(reversedTimes[index])
        }, 0)
        return seconds
    }

    static parseIdName = (data: any) => {
        return {
            id: data?.navigationEndpoint?.browseEndpoint?.browseId,
            name: data?.text,
        }
    }

    static parsePlaylist = (data: InnerTube.musicTwoRowItemRenderer) => {
        const playlist: Record<string, any> = {
            title: data.title.runs[0].text,
            playlistId: data.title.runs[0].navigationEndpoint.browseEndpoint.browseId.slice(2),
            thumbnails: data.thumbnailRenderer.musicThumbnailRenderer.thumbnail.thumbnails,
        }
        const subtitle = data.subtitle
        if ('runs' in subtitle) {
            playlist.description = Array.from(subtitle.runs, (run: any) => {
                return run.text
            }).join('')
            if (subtitle.runs.length === 3 && data.subtitle.runs[2].text.match(/\d+ /)) {
                playlist.count = data.subtitle.runs[2].text.split(' ')[0]
                playlist.author = this.parseSongArtistRuns(subtitle.runs.slice(0, 1))
            }
        }
        return playlist
    }

    static parseWatchPlaylist = (data: InnerTube.musicTwoRowItemRenderer) => {
        return {
            title: data.title.runs[0].text,
            playlistId: data.navigationEndpoint.watchPlaylistEndpoint.playlistId,
            thumbnails: data.thumbnailRenderer.musicThumbnailRenderer.thumbnail.thumbnails,
        }
    }

    static getFlexColumnItem = (item: any, index: number) => {
        if (item.flexColumns.length <= index || !('text' in item.flexColumns[index].musicResponsiveListItemFlexColumnRenderer) || !('runs' in item.flexColumns[index].musicResponsiveListItemFlexColumnRenderer.text)) {
            return null
        }
        return item.flexColumns[index].musicResponsiveListItemFlexColumnRenderer
    }
}
