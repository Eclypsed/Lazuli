// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
    namespace App {
        // interface Error {}
        interface Locals {
            user: User
        }
        // interface PageData {}
        // interface PageState {}
        // interface Platform {}
    }

    interface User {
        id: string
        username: string
        password?: string
    }

    interface Service {
        type: 'jellyfin' | 'youtube-music'
        userId: string
        urlOrigin: string
    }

    interface Connection {
        id: string
        user: User
        service: Service
        accessToken: string
    }

    interface MediaItem {
        connection: Connection
        id: string
        name: string
        duration: number
        thumbnail?: string
    }

    interface Song extends MediaItem {
        artists?: Artist[]
        albumId?: string
        audio: string
        video?: string
        releaseDate: string
    }

    interface Album extends MediaItem {
        artists: Artist[]
        songs: Song[]
        releaseDate: string
    }

    interface Playlist extends MediaItem {
        songs: Song[]
        description?: string
    }

    interface Artist {
        id: string
        name: string
        // Add more here in the future
    }

    namespace Jellyfin {
        // The jellyfin API will not always return the data it says it will, for example /Users/AuthenticateByName says it will
        // retrun the ServerName, it wont. This must be fetched from /System/Info.
        // So, ONLY DEFINE THE INTERFACES FOR DATA THAT IS GARUNTEED TO BE RETURNED (unless the data value itself is inherently optional)
        interface JFService extends Service {
            type: 'jellyfin'
            username: string
            serverName: string
        }

        interface JFConnection extends Connection {
            service: JFService
        }

        interface AuthData {
            User: {
                Id: string
            }
            AccessToken: string
        }

        interface User {
            Name: string
            Id: string
        }

        interface System {
            ServerName: string
        }

        interface MediaItem {
            Name: string
            Id: string
            RunTimeTicks: number
            Type: 'Audio' | 'MusicAlbum' | 'Playlist'
            ImageTags?: {
                Primary?: string
            }
        }

        interface Song extends Jellyfin.MediaItem {
            ProductionYear: number
            Type: 'Audio'
            ArtistItems?: {
                Name: string
                Id: string
            }[]
            Album?: string
            AlbumId?: string
            AlbumPrimaryImageTag?: string
            AlbumArtists?: {
                Name: string
                Id: string
            }[]
        }

        interface Album extends Jellyfin.MediaItem {
            ProductionYear: number
            Type: 'MusicAlbum'
            ArtistItems?: {
                Name: string
                Id: string
            }[]
            AlbumArtists?: {
                Name: string
                Id: string
            }[]
        }

        interface Playlist extends Jellyfin.MediaItem {
            Type: 'Playlist'
            ChildCount: number
        }
    }

    namespace YouTubeMusic {
        interface YTService extends Service {
            type: 'youtube-music'
            username: string
        }

        interface YTConnection extends Connection {
            service: YTService
        }
    }
}

export {}
