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

    // General Interface Desing tips:
    // Use possibly undefined `?:` for when a property is optional, meaning it could be there, or it could be not applicable
    // Use possibly null `| null` for when the property is expected to be there but could possbily be explicitly empty

    // Do not store data from other services in the database, only the data necessary to fetch whatever you need.
    // This avoid syncronization issues. E.g. Store userId, and urlOrigin to fetch the user's name and profile picture.

    interface User {
        id: string
        username: string
        password?: string
    }

    type serviceType = 'jellyfin' | 'youtube-music'

    interface Service {
        type: serviceType
        userId: string
        urlOrigin: string
    }

    interface Tokens {
        accessToken: string
        refreshToken?: string
        expiry?: number
    }

    interface Connection {
        id: string
        userId: string
        service: Service
        tokens: Tokens
    }

    interface ConnectionInfo {
        connectionId: string
        serviceType: serviceType
        username: string
    }

    // These Schemas should only contain general info data that is necessary for data fetching purposes.
    // They are NOT meant to be stores for large amounts of data, i.e. Don't include the data for every single song the Playlist type.
    // Big data should be fetched as needed in the app, these exist to ensure that the info necessary to fetch that data is there.
    interface MediaItem {
        connectionId: string
        serviceType: serviceType
        type: 'song' | 'album' | 'playlist' | 'artist'
        id: string
        name: string
        thumbnail?: string
    }

    interface Song extends MediaItem {
        type: 'song'
        duration: number
        artists: {
            id: string
            name: string
        }[]
        albumId?: string
        audio: string
        video?: string
        releaseDate: string
    }

    interface Album extends MediaItem {
        type: 'album'
        duration: number
        albumArtists: {
            id: string
            name: string
        }[]
        artists: {
            id: string
            name: string
        }[]
        releaseDate: string
    }

    interface Playlist extends MediaItem {
        type: 'playlist'
        duration: number
        description?: string
    }

    interface Artist extends MediaItem {
        type: 'artist'
    }

    namespace Jellyfin {
        // The jellyfin API will not always return the data it says it will, for example /Users/AuthenticateByName says it will
        // retrun the ServerName, it wont. This must be fetched from /System/Info.
        // So, ONLY DEFINE THE INTERFACES FOR DATA THAT IS GARUNTEED TO BE RETURNED (unless the data value itself is inherently optional)
        interface JFService extends Service {
            type: 'jellyfin'
        }

        interface JFTokens implements Tokens {
            accessToken: string
        }

        interface JFConnection extends Connection {
            service: JFService
            tokens: JFTokens
        }

        interface JFConnectionInfo extends ConnectionInfo {
            serviceType: 'jellyfin'
            servername: string
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
            Type: 'Audio' | 'MusicAlbum' | 'Playlist' | 'MusicArtist'
            ImageTags?: {
                Primary?: string
            }
        }

        interface Song extends Jellyfin.MediaItem {
            RunTimeTicks: number
            ProductionYear: number
            Type: 'Audio'
            ArtistItems: {
                Name: string
                Id: string
            }[]
            Album?: string
            AlbumId?: string
            AlbumPrimaryImageTag?: string
            AlbumArtists: {
                Name: string
                Id: string
            }[]
        }

        interface Album extends Jellyfin.MediaItem {
            RunTimeTicks: number
            ProductionYear: number
            Type: 'MusicAlbum'
            ArtistItems: {
                Name: string
                Id: string
            }[]
            AlbumArtists: {
                Name: string
                Id: string
            }[]
        }

        interface Playlist extends Jellyfin.MediaItem {
            RunTimeTicks: number
            Type: 'Playlist'
            ChildCount: number
        }

        interface Artist extends Jellyfin.MediaItem {
            Type: 'MusicArtist'
        }
    }

    namespace YouTubeMusic {
        interface YTService extends Service {
            type: 'youtube-music'
        }

        interface YTTokens implements Tokens {
            accessToken: string
            refreshToken: string
            expiry: number
        }

        interface YTConnection extends Connection {
            service: YTService
            tokens: YTTokens
        }

        interface YTConnectionInfo extends ConnectionInfo {
            serviceType: 'youtube-music'
            profilePicture?: string
        }
    }
}

export {}
