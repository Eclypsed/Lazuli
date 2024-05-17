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

export namespace InnerTube {
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
        createdBy: {
            id: string
            name: string
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
                secondSubtitle: {
                    // Will contain info like view count, track count, duration etc. (Don't try and scrape duration from this, it sucks. There's not much you can do with "7+ hours")
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
