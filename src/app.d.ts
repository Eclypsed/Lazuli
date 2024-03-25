// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
    namespace App {
        // interface Error {}
        interface Locals {
            user: Omit<User, 'passwordHash'>
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

    type User = {
        id: string
        username: string
        passwordHash: string
    }

    type serviceType = 'jellyfin' | 'youtube-music'

    type ConnectionInfo = {
        id: string
        userId: string
    } & (
        | {
              type: 'jellyfin'
              serviceInfo: Jellyfin.SerivceInfo
              tokens: Jellyfin.Tokens
          }
        | {
              type: 'youtube-music'
              serviceInfo: YouTubeMusic.SerivceInfo
              tokens: YouTubeMusic.Tokens
          }
    )

    interface Connection {
        getRecommendations: () => Promise<MediaItem[]>
        getConnectionInfo: () => Promise<ConnectionInfo>
        search: (searchTerm: string) => Promise<MediaItem[]>
    }
    // These Schemas should only contain general info data that is necessary for data fetching purposes.
    // They are NOT meant to be stores for large amounts of data, i.e. Don't include the data for every single song the Playlist type.
    // Big data should be fetched as needed in the app, these exist to ensure that the info necessary to fetch that data is there.
    interface MediaItem {
        type: 'song' | 'album' | 'playlist' | 'artist'
        id: string
        name: string
        thumbnail?: string
    }

    interface Song extends MediaItem {
        connection: {
            id: string
            type: serviceType
        }
        type: 'song'
        duration?: number
        artists?: {
            id: string
            name: string
        }[]
        album?: {
            id: string
            name: string
        }
        // audio: string <--- Because of youtube these will potentially expire. They are also not needed until a user requests that song, so instead fetch them as needed
        // video?: string
        releaseDate?: string
    }

    interface Album extends MediaItem {
        connection: {
            id: string
            type: serviceType
        }
        type: 'album'
        duration?: number
        artists?: {
            // Album Artists
            id: string
            name: string
        }[]
        releaseDate?: string
    }

    // IMPORTANT: This interface is for Lazuli created and stored playlists. Use service-specific interfaces when pulling playlists from services
    interface Playlist extends MediaItem {
        type: 'playlist'
        description?: string
        items: {
            connectionId: string
            id: string
        }[]
    }

    interface Artist extends MediaItem {
        type: 'artist'
    }

    namespace Jellyfin {
        // The jellyfin API will not always return the data it says it will, for example /Users/AuthenticateByName says it will
        // retrun the ServerName, it wont. This must be fetched from /System/Info.
        // So, ONLY DEFINE THE INTERFACES FOR DATA THAT IS GARUNTEED TO BE RETURNED (unless the data value itself is inherently optional)
        type SerivceInfo = {
            userId: string
            urlOrigin: string
            username?: string
            serverName?: string
        }

        type Tokens = {
            accessToken: string
        }
    }

    namespace YouTubeMusic {
        type SerivceInfo = {
            userId: string
            username?: string
            profilePicture?: string
        }

        type Tokens = {
            accessToken: string
            refreshToken: string
            expiry: number
        }

        interface HomeItems {
            listenAgain: MediaItem[]
            quickPicks: MediaItem[]
            newReleases: MediaItem[]
        }
    }
}

export {}
