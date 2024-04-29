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

    type ConnectionInfo = {
        id: string
        userId: string
    } & ({
        type: 'jellyfin'
        serverUrl: string
        serverName?: string
        jellyfinUserId: string
        username?: string
    } | {
        type: 'youtube-music'
        youtubeUserId: string
        username?: string
        profilePicture?: string
    })

    interface Connection {
        public id: string
        getRecommendations: () => Promise<(Song | Album | Artist | Playlist)[]>
        getConnectionInfo: () => Promise<ConnectionInfo>
        search: (searchTerm: string, filter?: 'song' | 'album' | 'artist' | 'playlist') => Promise<(Song | Album | Artist | Playlist)[]>
        getAudioStream: (id: string, range: string | null) => Promise<Response>
    }
    // These Schemas should only contain general info data that is necessary for data fetching purposes.
    // They are NOT meant to be stores for large amounts of data, i.e. Don't include the data for every single song the Playlist type.
    // Big data should be fetched as needed in the app, these exist to ensure that the info necessary to fetch that data is there.

    type Song = {
        connection: {
            id: string
            type: 'jellyfin' | 'youtube-music'
        }
        ids: {
            connection: string
            musicBrainz?: string
        }
        name: string
        type: 'song'
        duration: number // Seconds
        thumbnailUrl: string // Base/maxres url of song, any scaling for performance purposes will be handled by remoteImage endpoint    
        releaseDate: string // YYYY-MM-DD || YYYY-MM || YYYY
        artists?: { // Should try to order
            id: string
            name: string
            profilePicture?: string
        }[]
        album?: {
            id: string
            name: string
            thumbnailUrl: string
        }
        uploader?: {
            id: string
            name: string
            profilePicture?: string
        }
        isVideo: boolean
    }

    type Album = {
        connection: {
            id: string
            type: 'jellyfin' | 'youtube-music'
        }
        ids: {
            connection: string
            musicBrainz?: string
        }
        name: string
        type: 'album'
        thumbnailUrl: string
        artists: { // Should try to order
            id: string
            name: string
            profilePicture?: string
        }[] | 'Various Artists'
        releaseDate: string // YYYY-MM-DD || YYYY-MM || YYYY
        length: number
    }

    // Need to figure out how to do Artists, maybe just query MusicBrainz?
    type Artist = {
        connection: {
            id: string
            type: 'jellyfin' | 'youtube-music'
        }
        ids: {
            connection: string
            musicBrainz?: string
        }
        name: string
        type: 'artist'
        profilePicture?: string
    }

    type Playlist = {
        connection: {
            id: string
            type: 'jellyfin' | 'youtube-music'
        }
        id: string
        name: string
        type: 'playlist'
        thumbnailUrl: string
        createdBy?: {
            id: string
            name: string
            profilePicture?: string
        }
    }
}

export {}
