import { PUBLIC_VERSION } from '$env/static/public'

const jellyfinLogo = 'https://raw.githubusercontent.com/jellyfin/jellyfin-ux/55616553b692b1a6c7d8e786eeb7d8216e9b50df/branding/SVG/icon-transparent.svg'

export class Jellyfin implements Connection {
    public readonly id: string
    private readonly userId: string
    private readonly jellyfinUserId: string
    private readonly serverUrl: string
    private readonly accessToken: string

    private readonly authHeader: Headers

    constructor(id: string, userId: string, jellyfinUserId: string, serverUrl: string, accessToken: string) {
        this.id = id
        this.userId = userId
        this.jellyfinUserId = jellyfinUserId
        this.serverUrl = serverUrl
        this.accessToken = accessToken

        this.authHeader = new Headers({ Authorization: `MediaBrowser Token="${this.accessToken}"` })
    }

    public async getConnectionInfo() {
        const userUrl = new URL(`Users/${this.jellyfinUserId}`, this.serverUrl)
        const systemUrl = new URL('System/Info', this.serverUrl)

        const getUserData = () =>
            fetch(userUrl, { headers: this.authHeader })
                .then((response) => response.json() as Promise<JellyfinAPI.UserResponse>)
                .catch(() => null)

        const getSystemData = () =>
            fetch(systemUrl, { headers: this.authHeader })
                .then((response) => response.json() as Promise<JellyfinAPI.SystemResponse>)
                .catch(() => null)

        const [userData, systemData] = await Promise.all([getUserData(), getSystemData()])

        if (!userData) console.error(`Fetch to ${userUrl.toString()} failed`)
        if (!systemData) console.error(`Fetch to ${systemUrl.toString()} failed`)

        return {
            id: this.id,
            userId: this.userId,
            type: 'jellyfin',
            serverUrl: this.serverUrl,
            serverName: systemData?.ServerName,
            jellyfinUserId: this.jellyfinUserId,
            username: userData?.Name,
        } satisfies ConnectionInfo
    }

    public async search(searchTerm: string, filter: 'song'): Promise<Song[]>
    public async search(searchTerm: string, filter: 'album'): Promise<Album[]>
    public async search(searchTerm: string, filter: 'artist'): Promise<Artist[]>
    public async search(searchTerm: string, filter: 'playlist'): Promise<Playlist[]>
    public async search(searchTerm: string, filter?: undefined): Promise<(Song | Album | Artist | Playlist)[]>
    public async search(searchTerm: string, filter?: 'song' | 'album' | 'artist' | 'playlist'): Promise<(Song | Album | Artist | Playlist)[]> {
        const filterMap = { song: 'Audio', album: 'MusicAlbum', artist: 'MusicArtist', playlist: 'Playlist' } as const

        const searchParams = new URLSearchParams({
            searchTerm,
            includeItemTypes: filter ? filterMap[filter] : Object.values(filterMap).join(','),
            recursive: 'true',
        })

        const searchURL = new URL(`Users/${this.jellyfinUserId}/Items?${searchParams.toString()}`, this.serverUrl)
        const searchResponse = await fetch(searchURL, { headers: this.authHeader })
        if (!searchResponse.ok) throw new JellyfinFetchError('Failed to search Jellyfin', searchResponse.status, searchURL.toString())
        const searchResults = (await searchResponse.json()).Items as (JellyfinAPI.Song | JellyfinAPI.Album | JellyfinAPI.Artist | JellyfinAPI.Playlist)[]

        return searchResults.map((result) => {
            switch (result.Type) {
                case 'Audio':
                    return this.parseSong(result)
                case 'MusicAlbum':
                    return this.parseAlbum(result)
                case 'MusicArtist':
                    return this.parseArtist(result)
                case 'Playlist':
                    return this.parsePlaylist(result)
            }
        })
    }

    public async getRecommendations(): Promise<(Song | Album | Artist | Playlist)[]> {
        const searchParams = new URLSearchParams({
            SortBy: 'PlayCount',
            SortOrder: 'Descending',
            IncludeItemTypes: 'Audio',
            Recursive: 'true',
            limit: '10',
        })

        const mostPlayedSongsURL = new URL(`/Users/${this.jellyfinUserId}/Items?${searchParams.toString()}`, this.serverUrl)

        const mostPlayed: { Items: JellyfinAPI.Song[] } = await fetch(mostPlayedSongsURL, { headers: this.authHeader }).then((response) => response.json())

        return mostPlayed.Items.map((song) => this.parseSong(song))
    }

    // TODO: Figure out why seeking a jellyfin song takes so much longer than ytmusic (hls?)
    public async getAudioStream(id: string, headers: Headers) {
        const audoSearchParams = new URLSearchParams({
            MaxStreamingBitrate: '2000000',
            Container: 'opus,webm|opus,mp3,aac,m4a|aac,m4b|aac,flac,webma,webm|webma,wav,ogg',
            TranscodingContainer: 'ts',
            TranscodingProtocol: 'hls',
            AudioCodec: 'aac',
            userId: this.jellyfinUserId,
        })

        const audioUrl = new URL(`Audio/${id}/universal?${audoSearchParams.toString()}`, this.serverUrl)

        return fetch(audioUrl, { headers: Object.assign(headers, this.authHeader) })
    }

    public async getAlbum(id: string) {
        const albumUrl = new URL(`/Users/${this.jellyfinUserId}/Items/${id}`, this.serverUrl)

        const album = await fetch(albumUrl, { headers: this.authHeader })
            .then((response) => {
                if (!response.ok) {
                    if (response.status >= 500) throw Error(`Jellyfin Server of connection ${this.id} experienced and internal server error`)
                    throw TypeError(`Invalid album ${id} of jellyfin connection ${this.id}`)
                }
                return response.json() as Promise<JellyfinAPI.Album>
            })
            .catch(() => null)

        if (!album) throw Error(`Failed to fetch album ${id} of jellyfin connection ${this.id}`)

        return this.parseAlbum(album)
    }

    public async getAlbumItems(id: string) {
        const searchParams = new URLSearchParams({
            parentId: id,
            sortBy: 'ParentIndexNumber,IndexNumber,SortName',
        })

        const albumItemsUrl = new URL(`/Users/${this.jellyfinUserId}/Items?${searchParams.toString()}`, this.serverUrl)

        const albumItems = await fetch(albumItemsUrl, { headers: this.authHeader })
            .then((response) => {
                if (!response.ok) {
                    if (response.status >= 500) throw Error(`Jellyfin Server of connection ${this.id} experienced and internal server error`)
                    throw TypeError(`Invalid album ${id} of jellyfin connection ${this.id}`)
                }
                return response.json() as Promise<{ Items: JellyfinAPI.Song[] }>
            })
            .catch(() => null)

        if (!albumItems) throw Error(`Failed to fetch album ${id} items of jellyfin connection ${this.id}`)

        return albumItems.Items.map((item) => this.parseSong(item))
    }

    public async getPlaylist(id: string) {
        const playlistUrl = new URL(`/Users/${this.jellyfinUserId}/Items/${id}`, this.serverUrl)

        const playlist = await fetch(playlistUrl, { headers: this.authHeader })
            .then((response) => {
                if (!response.ok) {
                    if (response.status >= 500) throw Error(`Jellyfin Server of connection ${this.id} experienced and internal server error`)
                    throw TypeError(`Invalid playlist ${id} of jellyfin connection ${this.id}`)
                }
                return response.json() as Promise<JellyfinAPI.Playlist>
            })
            .catch(() => null)

        if (!playlist) throw Error(`Failed to fetch playlist ${id} of jellyfin connection ${this.id}`)

        return this.parsePlaylist(playlist)
    }

    public async getPlaylistItems(id: string, startIndex?: number, limit?: number) {
        const searchParams = new URLSearchParams({
            parentId: id,
            includeItemTypes: 'Audio',
        })

        if (startIndex) searchParams.append('startIndex', startIndex.toString())
        if (limit) searchParams.append('limit', limit.toString())

        const playlistItemsUrl = new URL(`/Users/${this.jellyfinUserId}/Items?${searchParams.toString()}`, this.serverUrl)

        const playlistItems = await fetch(playlistItemsUrl, { headers: this.authHeader })
            .then((response) => {
                if (!response.ok) {
                    if (response.status >= 500) throw Error(`Jellyfin Server of connection ${this.id} experienced and internal server error`)
                    throw TypeError(`Invalid playlist ${id} of jellyfin connection ${this.id}`)
                }
                return response.json() as Promise<{ Items: JellyfinAPI.Song[] }>
            })
            .catch(() => null)

        if (!playlistItems) throw Error(`Failed to fetch playlist ${id} items of jellyfin connection ${this.id}`)

        return playlistItems.Items.map((item) => this.parseSong(item))
    }

    private parseSong = (song: JellyfinAPI.Song): Song => {
        const thumbnailUrl = song.ImageTags?.Primary
            ? new URL(`Items/${song.Id}/Images/Primary`, this.serverUrl).toString()
            : song.AlbumPrimaryImageTag
              ? new URL(`Items/${song.AlbumId}/Images/Primary`, this.serverUrl).toString()
              : jellyfinLogo

        const artists: Song['artists'] = song.ArtistItems?.map((artist) => ({ id: artist.Id, name: artist.Name }))

        const album: Song['album'] = song.AlbumId && song.Album ? { id: song.AlbumId, name: song.Album } : undefined

        return {
            connection: { id: this.id, type: 'jellyfin' },
            id: song.Id,
            name: song.Name,
            type: 'song',
            duration: Math.floor(song.RunTimeTicks / 10000000),
            thumbnailUrl,
            releaseDate: song.ProductionYear ? new Date(song.ProductionYear.toString()).toISOString() : undefined,
            artists,
            album,
            isVideo: false,
        }
    }

    private parseAlbum = (album: JellyfinAPI.Album): Album => {
        const thumbnailUrl = album.ImageTags?.Primary ? new URL(`Items/${album.Id}/Images/Primary`, this.serverUrl).toString() : jellyfinLogo

        const artists: Album['artists'] = album.AlbumArtists?.map((artist) => ({ id: artist.Id, name: artist.Name })) ?? 'Various Artists'

        return {
            connection: { id: this.id, type: 'jellyfin' },
            id: album.Id,
            name: album.Name,
            type: 'album',
            thumbnailUrl,
            artists,
            releaseYear: album.ProductionYear?.toString(),
        }
    }

    private parseArtist(artist: JellyfinAPI.Artist): Artist {
        const profilePicture = artist.ImageTags?.Primary ? new URL(`Items/${artist.Id}/Images/Primary`, this.serverUrl).toString() : jellyfinLogo

        return {
            connection: { id: this.id, type: 'jellyfin' },
            id: artist.Id,
            name: artist.Name,
            type: 'artist',
            profilePicture,
        }
    }

    private parsePlaylist = (playlist: JellyfinAPI.Playlist): Playlist => {
        const thumbnailUrl = playlist.ImageTags?.Primary ? new URL(`Items/${playlist.Id}/Images/Primary`, this.serverUrl).toString() : jellyfinLogo

        return {
            connection: { id: this.id, type: 'jellyfin' },
            id: playlist.Id,
            name: playlist.Name,
            type: 'playlist',
            thumbnailUrl,
        }
    }

    public static authenticateByName = async (username: string, password: string, serverUrl: URL, deviceId: string): Promise<JellyfinAPI.AuthenticationResponse> => {
        const authUrl = new URL('/Users/AuthenticateByName', serverUrl.origin).toString()
        return fetch(authUrl, {
            method: 'POST',
            body: JSON.stringify({
                Username: username,
                Pw: password,
            }),
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'X-Emby-Authorization': `MediaBrowser Client="Lazuli", Device="Chrome", DeviceId="${deviceId}", Version="${PUBLIC_VERSION}"`,
            },
        })
            .catch(() => {
                throw new JellyfinFetchError('Could not reach Jellyfin Server', 400, authUrl)
            })
            .then((response) => {
                if (!response.ok) throw new JellyfinFetchError('Failed to Authenticate', 401, authUrl)
                return response.json() as Promise<JellyfinAPI.AuthenticationResponse>
            })
    }
}

export class JellyfinFetchError extends Error {
    public httpCode: number
    public url: string

    constructor(message: string, httpCode: number, url: string) {
        super(message)
        this.httpCode = httpCode
        this.url = url
    }
}

declare namespace JellyfinAPI {
    type Song = {
        Name: string
        Id: string
        Type: 'Audio'
        RunTimeTicks: number
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
