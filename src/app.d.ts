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

    type SearchFilterMap<Filter> =
        Filter extends 'song' ? Song :
        Filter extends 'album' ? Album :
        Filter extends 'artist' ? Artist :
        Filter extends 'playlist' ? Playlist :
        Filter extends undefined ? Song | Album | Artist | Playlist :
        never

    interface Connection {
        public id: string
        getConnectionInfo: () => Promise<ConnectionInfo>
        getRecommendations: () => Promise<(Song | Album | Artist | Playlist)[]>
        search: <T extends 'song' | 'album' | 'artist' | 'playlist'>(searchTerm: string, filter?: T) => Promise<SearchFilterMap<T>[]>

        /**
         * @param id The id of the requested song
         * @param headers The request headers sent by the Lazuli client that need to be relayed to the connection's request to the server (e.g. 'range').
         * @returns A promise of response object containing the audio stream for the specified byte range
         * 
         * Fetches the audio stream for a song. Will return an response containing the audio stream if the fetch was successfull, otherwise throw an error.
         */
        getAudioStream: (id: string, headers: Headers) => Promise<Response>

        /**
         * @param id The id of an album
         * @returns A promise of the album as an Album object
         */
        getAlbum: (id: string) => Promise<Album>

        /**
         * @param id The id of an album
         * @returns A promise of the songs in the album as and array of Song objects
         */
        getAlbumItems: (id: string) => Promise<Song[]>

        /**
         * @param id The id of a playlist
         * @returns A promise of the playlist of as a Playlist object
         */
        getPlaylist: (id: string) => Promise<Playlist>

        /**
         * @param id The id of a playlist
         * @param startIndex The index to start at (0 based). All playlist items with a lower index will be dropped from the results
         * @param limit The maximum number of playlist items to return
         * @returns A promise of the songs in the playlist as and array of Song objects
         */
        getPlaylistItems: (id: string, startIndex?: number, limit?: number) => Promise<Song[]>
    }

    // These Schemas should only contain general info data that is necessary for data fetching purposes.
    // They are NOT meant to be stores for large amounts of data, i.e. Don't include the data for every single song the Playlist type.
    // Big data should be fetched as needed in the app, these exist to ensure that the info necessary to fetch that data is there.

    // Additionally, these types are meant to represent the "previews" of the respective media item (e.g. Recomendation, search result).
    // As a result, in order to lessen the number of fetches made to external sources, only include data that is needed for these previews.

    type Song = {
        connection: {
            id: string
            type: 'jellyfin' | 'youtube-music'
        }
        id: string
        name: string
        type: 'song'
        duration: number // Seconds
        thumbnailUrl: string // Base/maxres url of song, any scaling for performance purposes will be handled by remoteImage endpoint    
        releaseDate?: string // ISOString
        artists?: { // Should try to order
            id: string
            name: string
        }[]
        album?: {
            id: string
            name: string
        }
        uploader?: {
            id: string
            name: string
        }
        isVideo: boolean
    }

    // Properties like duration and track count are properties of album items not the album itself
    type Album = {
        connection: {
            id: string
            type: 'jellyfin' | 'youtube-music'
        }
        id: string
        name: string
        type: 'album'
        thumbnailUrl: string
        artists: { // Should try to order
            id: string
            name: string
        }[] | 'Various Artists'
        releaseYear?: string // ####
    }

    // Need to figure out how to do Artists, maybe just query MusicBrainz?
    type Artist = {
        connection: {
            id: string
            type: 'jellyfin' | 'youtube-music'
        }
        id: string
        name: string
        type: 'artist'
        profilePicture?: string
    }

    type Playlist = { // Keep Playlist items seperate from the playlist itself. What's really nice is playlist items can just be an ordered array of Songs
        connection: {
            id: string
            type: 'jellyfin' | 'youtube-music'
        }
        id: string
        name: string
        type: 'playlist'
        thumbnailUrl: string
        createdBy?: { // Optional, in the case that a playlist is auto-generated or it's the user's playlist in which case this is unnecessary
            id: string
            name: string
        }
    }

    type HasDefinedProperty<T, K extends keyof T> = T & { [P in K]-?: Exclude<T[P], undefined> };
}

export {}
