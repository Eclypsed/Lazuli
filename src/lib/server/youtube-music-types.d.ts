// NOTE 1: Thumbnails
// When scraping thumbnails from the YTMusic browse pages, there are two different types of images that can be returned,
// standard video thumbnais and auto-generated square thumbnails for propper releases. The auto-generated thumbanils we want to
// keep from the scrape because:
// a) They can be easily scaled with ytmusic's weird fake query parameters (Ex: https://baseUrl=s1000)
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
//
// NEW NOTE: hq720 is the same as maxresdefault. If an hq720 image is returned we don't need to query the v3 api

export namespace InnerTube {
    namespace Library {
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
                                                gridRenderer: {
                                                    items: Array<{
                                                        musicTwoRowItemRenderer: AlbumMusicTwoRowItemRenderer
                                                    }>
                                                    continuations?: [
                                                        {
                                                            nextContinuationData: {
                                                                continuation: string
                                                            }
                                                        },
                                                    ]
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
        }

        interface AlbumContinuationResponse {
            continuationContents: {
                gridContinuation: {
                    items: Array<{
                        musicTwoRowItemRenderer: AlbumMusicTwoRowItemRenderer
                    }>
                    continuations?: [
                        {
                            nextContinuationData: {
                                continuation: string
                            }
                        },
                    ]
                }
            }
        }

        type AlbumMusicTwoRowItemRenderer = {
            thumbnailRenderer: {
                musicThumbnailRenderer: {
                    thumbnail: {
                        thumbnails: Array<{
                            url: string
                            width: number
                            height: number
                        }>
                    }
                }
            }
            title: {
                runs: [
                    {
                        text: string
                        navigationEndpoint: {
                            browseEndpoint: {
                                browseId: string
                            }
                        }
                    },
                ]
            }
            subtitle: {
                runs: Array<{
                    // Run's containing navigationEndpoints will be the album's artists. If many artists worked on an album a run will contain the text 'Various Artists'.
                    // The first run will always be 'Album', the last will always be the release year
                    text: string
                    navigationEndpoint?: {
                        browseEndpoint: {
                            browseId: string
                        }
                    }
                }>
            }
            navigationEndpoint: {
                browseEndpoint: {
                    browseId: string
                }
            }
        }

        interface ArtistResponse {
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
                                                        musicResponsiveListItemRenderer: ArtistMusicResponsiveListItemRenderer
                                                    }>
                                                    continuations?: [
                                                        {
                                                            nextContinuationData: {
                                                                continuation: string
                                                            }
                                                        },
                                                    ]
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
        }

        interface ArtistContinuationResponse {
            continuationContents: {
                musicShelfContinuation: {
                    contents: Array<{
                        musicResponsiveListItemRenderer: ArtistMusicResponsiveListItemRenderer
                    }>
                    continuations?: [
                        {
                            nextContinuationData: {
                                continuation: string
                            }
                        },
                    ]
                }
            }
        }

        type ArtistMusicResponsiveListItemRenderer = {
            thumbnail: {
                musicThumbnailRenderer: {
                    thumbnail: {
                        thumbnails: Array<{
                            url: string
                            width: number
                            height: number
                        }>
                    }
                }
            }
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
            ]
            navigationEndpoint: {
                browseEndpoint: {
                    browseId: string
                }
            }
        }

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
                                                gridRenderer: {
                                                    items: Array<{
                                                        musicTwoRowItemRenderer:
                                                            | NewPlaylistMusicTwoRowItemRenderer
                                                            | LikedMusicPlaylistMusicTwoRowItemRenderer
                                                            | EpisodesPlaylistMusicTwoRowItemRenderer
                                                            | PlaylistMusicTwoRowItemRenderer
                                                    }>
                                                    continuations?: [
                                                        {
                                                            nextContinuationData: {
                                                                continuation: string
                                                            }
                                                        },
                                                    ]
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
        }

        interface PlaylistContinuationResponse {
            continuationContents: {
                gridContinuation: {
                    items: Array<{
                        musicTwoRowItemRenderer: NewPlaylistMusicTwoRowItemRenderer | LikedMusicPlaylistMusicTwoRowItemRenderer | EpisodesPlaylistMusicTwoRowItemRenderer | PlaylistMusicTwoRowItemRenderer
                    }>
                    continuations?: [
                        {
                            nextContinuationData: {
                                continuation: string
                            }
                        },
                    ]
                }
            }
        }

        type NewPlaylistMusicTwoRowItemRenderer = {
            navigationEndpoint: {
                createPlaylistEndpoint: Object
            }
        }

        type LikedMusicPlaylistMusicTwoRowItemRenderer = {
            navigationEndpoint: {
                browseEndpoint: {
                    browseId: 'VLLM'
                }
            }
        }

        type EpisodesPlaylistMusicTwoRowItemRenderer = {
            navigationEndpoint: {
                browseEndpoint: {
                    browseId: 'VLSE'
                }
            }
        }

        type PlaylistMusicTwoRowItemRenderer = {
            thumbnailRenderer: {
                musicThumbnailRenderer: {
                    thumbnail: {
                        thumbnails: Array<{
                            url: string
                            width: number
                            height: number
                        }>
                    }
                }
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
                        // If present, this run is the creator of the playlist
                        browseEndpoint: {
                            browseId: string
                        }
                    }
                }>
            }
            navigationEndpoint: {
                browseEndpoint: {
                    browseId: string
                }
            }
        }
    }

    namespace Playlist {
        interface Response {
            contents: {
                twoColumnBrowseResultsRenderer: {
                    secondaryContents: {
                        sectionListRenderer: {
                            contents: [
                                {
                                    musicPlaylistShelfRenderer: {
                                        contents: Array<{
                                            musicResponsiveListItemRenderer: MusicResponsiveListItemRenderer
                                        }>
                                        continuations?: [
                                            {
                                                nextContinuationData: {
                                                    continuation: string
                                                }
                                            },
                                        ]
                                    }
                                },
                            ]
                        }
                    }
                    tabs: [
                        {
                            tabRenderer: {
                                content: {
                                    sectionListRenderer: {
                                        contents: [
                                            | {
                                                  musicEditablePlaylistDetailHeaderRenderer: {
                                                      header: {
                                                          musicResponsiveHeaderRenderer: MusicResponsiveHeaderRenderer
                                                      }
                                                  }
                                              }
                                            | {
                                                  musicResponsiveHeaderRenderer: MusicResponsiveHeaderRenderer
                                              },
                                        ]
                                    }
                                }
                            }
                        },
                    ]
                }
            }
        }

        interface ContinuationResponse {
            continuationContents: {
                musicPlaylistShelfContinuation: {
                    contents: Array<{
                        musicResponsiveListItemRenderer: MusicResponsiveListItemRenderer
                    }>
                    continuations?: [
                        {
                            nextContinuationData: {
                                continuation: string
                            }
                        },
                    ]
                }
            }
        }

        interface ErrorResponse {
            error: {
                code: number
                message: string
                status: string
            }
        }

        type MusicResponsiveHeaderRenderer = {
            thumbnail: {
                musicThumbnailRenderer: {
                    thumbnail: {
                        thumbnails: Array<{
                            url: string
                            width: number
                            height: number
                        }>
                    }
                }
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
                    text: string // Last one is the release year
                }>
            }
            straplineTextOne: {
                runs: [
                    {
                        text: string
                        navigationEndpoint?: {
                            // If the playlist is an auto-generated radio it will not have this
                            browseEndpoint: {
                                browseId: string
                                browseEndpointContextSupportedConfigs: {
                                    browseEndpointContextMusicConfig: {
                                        pageType: 'MUSIC_PAGE_TYPE_USER_CHANNEL' // Should ALWAYS be user channel, even if the playlist was created by an artist
                                    }
                                }
                            }
                        }
                    },
                ]
            }
            straplineThumbnail?: {
                // The profile picture of the user that created the playlist. Missing in radios
                musicThumbnailRenderer: {
                    thumbnail: {
                        thumbnails: Array<{
                            url: string
                            width: number
                            height: number
                        }>
                    }
                }
            }
            description?: {
                musicDescriptionShelfRenderer: {
                    description: {
                        runs: [
                            {
                                text: string
                            },
                        ]
                    }
                }
            }
        }

        type MusicResponsiveListItemRenderer = {
            thumbnail: {
                musicThumbnailRenderer: {
                    thumbnail: {
                        thumbnails: Array<{
                            url: string
                            width: number
                            height: number
                        }>
                    }
                }
            }
            flexColumns: [
                {
                    musicResponsiveListItemFlexColumnRenderer: {
                        text: {
                            runs: [
                                {
                                    text: string // Song Name
                                    navigationEndpoint: {
                                        watchEndpoint: {
                                            videoId: string
                                            watchEndpointMusicSupportedConfigs: {
                                                watchEndpointMusicConfig: {
                                                    musicVideoType: 'MUSIC_VIDEO_TYPE_UGC' | 'MUSIC_VIDEO_TYPE_OMV' | 'MUSIC_VIDEO_TYPE_ATV' | 'MUSIC_VIDEO_TYPE_OFFICIAL_SOURCE_MUSIC'
                                                }
                                            }
                                        }
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
                                text: string // Name of Artist or Uploader or a Delimiter
                                navigationEndpoint?: {
                                    // Not present on delimiters
                                    browseEndpoint: {
                                        browseId: string
                                        browseEndpointContextSupportedConfigs: {
                                            browseEndpointContextMusicConfig: {
                                                pageType: 'MUSIC_PAGE_TYPE_ARTIST' | 'MUSIC_PAGE_TYPE_USER_CHANNEL'
                                            }
                                        }
                                    }
                                }
                            }>
                        }
                    }
                },
                {
                    musicResponsiveListItemFlexColumnRenderer: {
                        text: {
                            runs?: [
                                // Undefined if song does not have an album
                                {
                                    text: string
                                    navigationEndpoint: {
                                        browseEndpoint: {
                                            browseId: string
                                            browseEndpointContextSupportedConfigs: {
                                                browseEndpointContextMusicConfig: {
                                                    pageType: 'MUSIC_PAGE_TYPE_ALBUM'
                                                }
                                            }
                                        }
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
                                    text: string // Duration timestamp
                                },
                            ]
                        }
                    }
                },
            ]
        }
    }

    namespace Album {
        interface AlbumResponse {
            contents: {
                twoColumnBrowseResultsRenderer: {
                    secondaryContents: {
                        sectionListRenderer: {
                            contents: [
                                {
                                    musicShelfRenderer: {
                                        contents: Array<{
                                            musicResponsiveListItemRenderer: MusicResponsiveListItemRenderer
                                        }>
                                    }
                                },
                            ]
                            continuations?: [
                                // Not actually sure if this will ever show up, I'm just assuming this would work like playlists
                                {
                                    nextContinuationData: {
                                        continuation: string
                                    }
                                },
                            ]
                        }
                    }
                    tabs: [
                        {
                            tabRenderer: {
                                content: {
                                    sectionListRenderer: {
                                        contents: [
                                            {
                                                musicResponsiveHeaderRenderer: {
                                                    thumbnail: {
                                                        musicThumbnailRenderer: {
                                                            thumbnail: {
                                                                thumbnails: Array<{
                                                                    url: string
                                                                    width: number
                                                                    height: number
                                                                }>
                                                            }
                                                        }
                                                    }
                                                    title: {
                                                        runs: [
                                                            {
                                                                text: string // Album Name
                                                            },
                                                        ]
                                                    }
                                                    subtitle: {
                                                        runs: Array<{
                                                            text: string // Last one is the release year
                                                        }>
                                                    }
                                                    straplineTextOne: {
                                                        runs: Array<{
                                                            text: string // Artist name or 'Various Artists' or some other kind of unlinked string like 'Camellia & Akira Complex'
                                                            navigationEndpoint?: {
                                                                // Absesnt on single string descriptors and delimiters
                                                                browseEndpoint: {
                                                                    browseId: string
                                                                    browseEndpointContextSupportedConfigs: {
                                                                        browseEndpointContextMusicConfig: {
                                                                            pageType: 'MUSIC_PAGE_TYPE_ARTIST'
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }>
                                                    }
                                                    straplineThumbnail?: {
                                                        musicThumbnailRenderer: {
                                                            thumbnail: {
                                                                thumbnails: Array<{
                                                                    url: string
                                                                    width: number
                                                                    height: number
                                                                }>
                                                            }
                                                        }
                                                    }
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
        }

        interface ContinuationResponse {
            // Again, never actually seen this before but I'm assuming this is how it works
            continuationContents: {
                musicShelfRenderer: {
                    contents: Array<{
                        musicResponsiveListItemRenderer: MusicResponsiveListItemRenderer
                    }>
                    continuations?: [
                        {
                            nextContinuationData: {
                                continuation: string
                            }
                        },
                    ]
                }
            }
        }

        interface ErrorResponse {
            error: {
                code: number
                message: string
                status: string
            }
        }

        type MusicResponsiveListItemRenderer = {
            flexColumns: [
                {
                    musicResponsiveListItemFlexColumnRenderer: {
                        text: {
                            runs: [
                                {
                                    text: string // Song Name
                                    navigationEndpoint: {
                                        watchEndpoint: {
                                            videoId: string
                                            watchEndpointMusicSupportedConfigs: {
                                                watchEndpointMusicConfig: {
                                                    musicVideoType: 'MUSIC_VIDEO_TYPE_ATV' // It *should* only ever be auto-generated
                                                }
                                            }
                                        }
                                    }
                                },
                            ]
                        }
                    }
                },
                {
                    musicResponsiveListItemFlexColumnRenderer: {
                        text: {
                            runs?: Array<{
                                // If runs is missing that means all tracks have the same artist, and we can assert that there is definitely an artist with an id in straplineTextOne
                                text: string // Artist Name
                                navigationEndpoint?: {
                                    // Missing if there is a delimiter between multiple artists
                                    browseEndpoint: {
                                        browseId: string
                                        browseEndpointContextSupportedConfigs: {
                                            browseEndpointContextMusicConfig: {
                                                pageType: 'MUSIC_PAGE_TYPE_ARTIST'
                                            }
                                        }
                                    }
                                }
                            }>
                        }
                    }
                },
                // The IS a third column but it only contains play count
            ]
            fixedColumns: [
                {
                    musicResponsiveListItemFixedColumnRenderer: {
                        text: {
                            runs: [
                                {
                                    text: string // Duration timestamp
                                },
                            ]
                        }
                    }
                },
            ]
        }
    }

    namespace Player {
        type PlayerResponse = {
            playabilityStatus: {
                status: 'OK'
            }
            streamingData: {
                formats?: Format[]
                adaptiveFormats?: Format[]
                dashManifestUrl?: string
                hlsManifestUrl?: string
            }
        }

        interface PlayerErrorResponse {
            playabilityStatus: {
                status: 'ERROR'
                reason: string
            }
        }

        type Format = {
            itag: number
            url?: string // Only present for Android client requests, not web requests
            mimeType: string
            bitrate: number
            qualityLabel?: string // If present, format contains video (144p, 240p, 360p, etc.)
            audioQuality?: string // If present, format contains audio (AUDIO_QUALITY_LOW, AUDIO_QUALITY_MEDIUM, AUDIO_QUALITY_HIGH)
            signatureCipher?: string // Only present for Web client requests, not android requests
        }
    }

    namespace Queue {
        interface Response {
            queueDatas: Array<{
                content:
                    | {
                          playlistPanelVideoRenderer: PlaylistPanelVideoRenderer // This occurs when the playlist item does not have a video or auto-generated counterpart
                      }
                    | {
                          playlistPanelVideoWrapperRenderer: {
                              // This occurs when the playlist has a video or auto-generated counterpart
                              primaryRenderer: {
                                  playlistPanelVideoRenderer: PlaylistPanelVideoRenderer
                              }
                              counterpart: [
                                  {
                                      counterpartRenderer: {
                                          playlistPanelVideoRenderer: PlaylistPanelVideoRenderer
                                      }
                                  },
                              ]
                          }
                      }
            }>
        }

        interface ErrorResponse {
            error: {
                code: number
                message: string
                status: string
            }
        }

        type PlaylistPanelVideoRenderer = {
            title: {
                runs: [
                    {
                        text: string
                    },
                ]
            }
            longBylineText: {
                runs: Array<{
                    text: string
                    navigationEndpoint?: {
                        browseEndpoint: {
                            browseId: string
                            browseEndpointContextSupportedConfigs: {
                                browseEndpointContextMusicConfig: {
                                    pageType: 'MUSIC_PAGE_TYPE_ALBUM' | 'MUSIC_PAGE_TYPE_ARTIST' | 'MUSIC_PAGE_TYPE_USER_CHANNEL'
                                }
                            }
                        }
                    }
                }>
            }
            thumbnail: {
                thumbnails: Array<{
                    url: string
                    width: number
                    height: number
                }>
            }
            lengthText: {
                runs: [
                    {
                        text: string // The duration in timestamp format - hh:mm:ss
                    },
                ]
            }
            videoId: string
            navigationEndpoint: {
                watchEndpoint: {
                    watchEndpointMusicSupportedConfigs: {
                        watchEndpointMusicConfig: {
                            musicVideoType: 'MUSIC_VIDEO_TYPE_UGC' | 'MUSIC_VIDEO_TYPE_OMV' | 'MUSIC_VIDEO_TYPE_ATV' | 'MUSIC_VIDEO_TYPE_OFFICIAL_SOURCE_MUSIC'
                        }
                    }
                }
            }
        }
    }

    // TODO: Need to fix this & it's corresponding method & add appropriate namespace
    interface SearchResponse {
        contents: unknown
    }

    // TODO: Need to fix this & it's corresponding method & add appropriate namespace
    interface HomeResponse {
        contents: unknown
    }
}
