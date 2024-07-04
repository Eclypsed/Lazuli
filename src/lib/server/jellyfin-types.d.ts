export namespace JellyfinAPI {
    type Song = {
        Name: string
        Id: string
        Type: 'Audio'
        RunTimeTicks: number
        PremiereDate?: string
        ProductionYear?: number
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
        ImageTags?: {
            Primary?: string
        }
    }

    type Album = {
        Name: string
        Id: string
        Type: 'MusicAlbum'
        RunTimeTicks: number
        PremiereDate?: string
        ProductionYear?: number
        ArtistItems?: {
            Name: string
            Id: string
        }[]
        AlbumArtists?: {
            Name: string
            Id: string
        }[]
        ImageTags?: {
            Primary?: string
        }
    }

    type Artist = {
        Name: string
        Id: string
        Type: 'MusicArtist'
        ImageTags?: {
            Primary?: string
        }
    }

    type Playlist = {
        Name: string
        Id: string
        Type: 'Playlist'
        RunTimeTicks: number
        ChildCount: number
        ImageTags?: {
            Primary?: string
        }
    }

    interface UserResponse {
        Name: string
        Id: string
    }

    interface AuthenticationResponse {
        User: JellyfinAPI.UserResponse
        AccessToken: string
    }

    interface SystemResponse {
        ServerName: string
    }
}
