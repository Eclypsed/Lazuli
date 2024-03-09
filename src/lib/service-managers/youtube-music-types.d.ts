export namespace InnerTube {
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
