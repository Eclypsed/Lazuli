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
        username: string
        profilePicture: string
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
        connection: string
        id: string
        name: string
        type: 'song'
        duration?: number
        thumbnail?: string
        artists?: {
            id: string
            name: string
        }[]
        album?: {
            id: string
            name: string
        }
        createdBy?: {
            id: string
            name: string
        }
        releaseDate?: string
    }

    type Album = {
        connection: string
        id: string
        name: string
        type: 'album'
        duration?: number
        thumbnail?: string
        artists?: {
            // Album Artists
            id: string
            name: string
        }[]
        releaseDate?: string
    }

    // Need to figure out how to do Artists, maybe just query MusicBrainz?
    type Artist = {
        connection: string
        id: string
        name: string
        type: 'artist'
        thumbnail?: string
    }

    type Playlist = {
        connection: string
        id: string
        name: string
        type: 'playlist'
        createdBy?: {
            id: string
            name: string
        }
        thumbnail?: string
    }
}

export {}
