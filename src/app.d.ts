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

    // Note to self: POST vs PUT vs PATCH
    // Use POST when a new resource is being created
    // Use PUT when a resource is being replaced. Semantically, PUT means the entire replacement resource needs to be provided in the request
    // Use PATCH when a resource is being changed or updated. Semantically, PATCH means only a partial resource needs to be provided in the request (The parts being updated/changed)

    type ConnectionType = 'jellyfin' | 'youtube-music'

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

    type MediaItemTypeMap = {
        song: Song
        album: Album
        artist: Artist
        playlist: Playlist
    }

    type SearchFilterMap<Filter> =
        Filter extends 'song' ? Song :
        Filter extends 'album' ? Album :
        Filter extends 'artist' ? Artist :
        Filter extends 'playlist' ? Playlist :
        Filter extends undefined ? Song | Album | Artist | Playlist :
        never

    interface Connection {
        public readonly id: string

        /** Retireves general information about the connection */
        getConnectionInfo(): Promise<ConnectionInfo>

        /** Get's the user's recommendations from the corresponding service */
        getRecommendations(): Promise<(Song | Album | Artist | Playlist)[]>

        /**
         * @param {string} searchTerm The string of text to query
         * @param {'song' | 'album' | 'artist' | 'playlist'} filter Optional. A string of either 'song', 'album', 'artist', or 'playlist' to filter the kind of media items queried
         * @returns {Promise<(Song | Album | Artist | Playlist)[]>} A promise of an array of media items
         */
        search<T extends 'song' | 'album' | 'artist' | 'playlist'>(searchTerm: string, filter?: T): Promise<SearchFilterMap<T>[]>

        /**
         * @param {string} id The id of the requested song
         * @param {Headers} headers The request headers sent by the Lazuli client that need to be relayed to the connection's request to the server (e.g. 'range').
         * @returns {Promise<Response>} A promise of response object containing the audio stream for the specified byte range
         * 
         * Fetches the audio stream for a song. Will return an response containing the audio stream if the fetch was successfull, otherwise throw an error.
         */
        getAudioStream(id: string, headers: Headers): Promise<Response>

        /**
         * @param {string} id The id of an album
         * @returns {Promise<Album>} A promise of the album as an Album object
         */
        getAlbum(id: string): Promise<Album>

        /**
         * @param {string} id The id of an album
         * @returns {Promise<Song[]>} A promise of the songs in the album as and array of Song objects
         */
        getAlbumItems(id: string): Promise<Song[]>

        /**
         * @param {string} id The id of a playlist
         * @returns {Promise<Playlist>} A promise of the playlist of as a Playlist object
         */
        getPlaylist(id: string): Promise<Playlist>

        /**
         * @param {string} id The id of a playlist
         * @param {number} startIndex The index to start at (0 based). All playlist items with a lower index will be dropped from the results
         * @param {number} limit The maximum number of playlist items to return
         * @returns {Promise<Song[]>} A promise of the songs in the playlist as and array of Song objects
         */
        getPlaylistItems(id: string, options?: { startIndex?: number, limit?: number }): Promise<Song[]>

        public readonly songs?: { // Optional because YouTube Music can't be asked to provide an actually useful API.
            songs(ids: string[]): Promise<Song[]>
        }

        public readonly library: {
            albums(): Promise<Album[]>
            artists(): Promise<Artist[]>
            playlists(): Promise<Playlist[]>
        }
    }

    // These Schemas should only contain general info data that is necessary for data fetching purposes.
    // They are NOT meant to be stores for large amounts of data, i.e. Don't include the data for every single song the Playlist type.
    // Big data should be fetched as needed in the app, these exist to ensure that the info necessary to fetch that data is there.

    // Additionally, these types are meant to represent the "previews" of the respective media item (e.g. Recomendation, search result).
    // As a result, in order to lessen the number of fetches made to external sources, only include data that is needed for these previews.

    type Song = {
        connection: {
            id: string
            type: ConnectionType
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
            type: ConnectionType
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
            type: ConnectionType
        }
        id: string
        name: string
        type: 'artist'
        profilePicture?: string
    }

    type Playlist = { // Keep Playlist items seperate from the playlist itself. What's really nice is playlist items can just be an ordered array of Songs
        connection: {
            id: string
            type: ConnectionType
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

    type Mix = {
        id: string
        name: string
        thumbnail?: string
        description?: string
        trackCount: number
        duration: number
    }

    type HasDefinedProperty<T, K extends keyof T> = T & { [P in K]-?: Exclude<T[P], undefined> };
}

export {}
