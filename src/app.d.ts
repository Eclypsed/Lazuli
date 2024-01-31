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

    namespace Jellyfin {
        interface AuthData {
            User: {
                Name: string
                Id: string
            }
            AccessToken: string
        }
    }

    interface User {
        id: string
        username: string
        password?: string
    }

    type ServiceType = 'jellyfin' | 'youtube-music'

    interface MediaItem {
        connectionId: string
        serviceType: string
        id: string
        name: string
        duration: number
        thumbnail: string
    }

    interface Song extends MediaItem {
        artists: {
            id: string
            name: string
        }[]
        album?: {
            id: string
            name: string
            artists: {
                id: string
                name: string
            }[]
        }
        audio: string
        video?: string
        releaseDate: string
    }

    interface Album extends MediaItem {
        artists: {
            id: string
            name: string
        }[]
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
}

export {}
