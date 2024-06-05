import { PUBLIC_VERSION } from '$env/static/public'

const jellyfinLogo = 'https://raw.githubusercontent.com/jellyfin/jellyfin-ux/55616553b692b1a6c7d8e786eeb7d8216e9b50df/branding/SVG/icon-transparent.svg'

export class Jellyfin implements Connection {
    public readonly id: string
    private readonly userId: string
    private readonly jellyfinUserId: string

    private readonly services: JellyfinServices
    private libraryManager?: JellyfinLibraryManager

    constructor(id: string, userId: string, jellyfinUserId: string, serverUrl: string, accessToken: string) {
        this.id = id
        this.userId = userId
        this.jellyfinUserId = jellyfinUserId

        this.services = new JellyfinServices(this.id, serverUrl, accessToken)
    }

    public get library() {
        if (!this.libraryManager) this.libraryManager = new JellyfinLibraryManager(this.jellyfinUserId, this.services)

        return this.libraryManager
    }

    public async getConnectionInfo() {
        const userEndpoint = `Users/${this.jellyfinUserId}`
        const systemEndpoint = 'System/Info'

        const getUserData = () =>
            this.services
                .request(userEndpoint)
                .then((response) => response.json() as Promise<JellyfinAPI.UserResponse>)
                .catch(() => null)

        const getSystemData = () =>
            this.services
                .request(systemEndpoint)
                .then((response) => response.json() as Promise<JellyfinAPI.SystemResponse>)
                .catch(() => null)

        const [userData, systemData] = await Promise.all([getUserData(), getSystemData()])

        if (!userData) console.error(`Fetch to ${userEndpoint.toString()} failed`)
        if (!systemData) console.error(`Fetch to ${systemEndpoint.toString()} failed`)

        return {
            id: this.id,
            userId: this.userId,
            type: 'jellyfin',
            serverUrl: this.services.serverUrl().toString(),
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

        const searchResults = await this.services
            .request(`Users/${this.jellyfinUserId}/Items?${searchParams.toString()}`)
            .then((response) => response.json() as Promise<{ Items: (JellyfinAPI.Song | JellyfinAPI.Album | JellyfinAPI.Artist | JellyfinAPI.Playlist)[] }>)

        return searchResults.Items.map((result) => {
            switch (result.Type) {
                case 'Audio':
                    return this.services.parseSong(result)
                case 'MusicAlbum':
                    return this.services.parseAlbum(result)
                case 'MusicArtist':
                    return this.services.parseArtist(result)
                case 'Playlist':
                    return this.services.parsePlaylist(result)
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

        return this.services
            .request(`/Users/${this.jellyfinUserId}/Items?${searchParams.toString()}`)
            .then((response) => response.json() as Promise<{ Items: JellyfinAPI.Song[] }>)
            .then((data) => data.Items.map((song) => this.services.parseSong(song)))
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

        return this.services.request(`Audio/${id}/universal?${audoSearchParams.toString()}`, { headers, keepalive: true })
    }

    public async getAlbum(id: string) {
        return this.services
            .request(`/Users/${this.jellyfinUserId}/Items/${id}`)
            .then((response) => response.json() as Promise<JellyfinAPI.Album>)
            .then(this.services.parseAlbum)
    }

    public async getAlbumItems(id: string) {
        const searchParams = new URLSearchParams({
            parentId: id,
            sortBy: 'ParentIndexNumber,IndexNumber,SortName',
        })

        return this.services
            .request(`/Users/${this.jellyfinUserId}/Items?${searchParams.toString()}`)
            .then((response) => response.json() as Promise<{ Items: JellyfinAPI.Song[] }>)
            .then((data) => data.Items.map(this.services.parseSong))
    }

    public async getPlaylist(id: string) {
        return this.services
            .request(`/Users/${this.jellyfinUserId}/Items/${id}`)
            .then((response) => response.json() as Promise<JellyfinAPI.Playlist>)
            .then(this.services.parsePlaylist)
    }

    public async getPlaylistItems(id: string, options?: { startIndex?: number; limit?: number }) {
        const searchParams = new URLSearchParams({
            parentId: id,
            includeItemTypes: 'Audio',
        })

        if (options?.startIndex) searchParams.append('startIndex', options.startIndex.toString())
        if (options?.limit) searchParams.append('limit', options.limit.toString())

        return this.services
            .request(`/Users/${this.jellyfinUserId}/Items?${searchParams.toString()}`)
            .then((response) => response.json() as Promise<{ Items: JellyfinAPI.Song[] }>)
            .then((data) => data.Items.map(this.services.parseSong))
    }

    public static async authenticateByName(username: string, password: string, serverUrl: URL, deviceId: string): Promise<JellyfinAPI.AuthenticationResponse> {
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

class JellyfinServices {
    private readonly connectionId: string

    public readonly serverUrl: (endpoint?: string) => URL
    public readonly request: (endpoint: string, options?: RequestInit) => Promise<Response>

    constructor(connectionId: string, serverUrl: string, accessToken: string) {
        this.connectionId = connectionId

        this.serverUrl = (endpoint?: string) => new URL(endpoint ?? '', serverUrl)

        this.request = async (endpoint: string, options?: RequestInit) => {
            const headers = new Headers(options?.headers)
            headers.set('Authorization', `MediaBrowser Token="${accessToken}"`)
            delete options?.headers
            return fetch(this.serverUrl(endpoint), { headers, ...options }).then((response) => {
                if (!response.ok) {
                    if (response.status >= 500) throw Error(`Jellyfin Server of connection ${this.connectionId} experienced and internal server error`)
                    throw TypeError(`Client side error in request to jellyfin server of connection ${this.connectionId}`)
                }
                return response
            })
        }
    }

    private getBestThumbnail = (item: JellyfinAPI.Song | JellyfinAPI.Album | JellyfinAPI.Artist | JellyfinAPI.Playlist) => {
        const imageItemId = item.ImageTags?.Primary ? item.Id : 'AlbumPrimaryImageTag' in item && item.AlbumPrimaryImageTag ? item.AlbumId : undefined
        return imageItemId ? this.serverUrl(`Items/${imageItemId}/Images/Primary`).toString() : jellyfinLogo
    }

    public parseSong = (song: JellyfinAPI.Song): Song => ({
        connection: { id: this.connectionId, type: 'jellyfin' },
        id: song.Id,
        name: song.Name,
        type: 'song',
        duration: Math.floor(song.RunTimeTicks / 10000000),
        thumbnailUrl: this.getBestThumbnail(song),
        releaseDate: song.PremiereDate ? new Date(song.PremiereDate).toISOString() : undefined,
        artists: song.ArtistItems?.map((artist) => ({ id: artist.Id, name: artist.Name })),
        album: song.AlbumId && song.Album ? { id: song.AlbumId, name: song.Album } : undefined,
        isVideo: false,
    })

    public parseAlbum = (album: JellyfinAPI.Album): Album => ({
        connection: { id: this.connectionId, type: 'jellyfin' },
        id: album.Id,
        name: album.Name,
        type: 'album',
        thumbnailUrl: this.getBestThumbnail(album),
        artists: album.AlbumArtists?.map((artist) => ({ id: artist.Id, name: artist.Name })) ?? 'Various Artists',
        releaseYear: album.ProductionYear?.toString(),
    })

    public parseArtist = (artist: JellyfinAPI.Artist): Artist => ({
        connection: { id: this.connectionId, type: 'jellyfin' },
        id: artist.Id,
        name: artist.Name,
        type: 'artist',
        profilePicture: this.getBestThumbnail(artist),
    })

    public parsePlaylist = (playlist: JellyfinAPI.Playlist): Playlist => ({
        connection: { id: this.connectionId, type: 'jellyfin' },
        id: playlist.Id,
        name: playlist.Name,
        type: 'playlist',
        thumbnailUrl: this.getBestThumbnail(playlist),
    })
}

class JellyfinLibraryManager {
    private readonly jellyfinUserId: string
    private readonly services: JellyfinServices

    constructor(jellyfinUserId: string, services: JellyfinServices) {
        this.jellyfinUserId = jellyfinUserId
        this.services = services
    }

    public async albums(): Promise<Album[]> {
        return this.services
            .request(`/Users/${this.jellyfinUserId}/Items?sortBy=SortName&sortOrder=Ascending&includeItemTypes=MusicAlbum&recursive=true`)
            .then((response) => response.json() as Promise<{ Items: JellyfinAPI.Album[] }>)
            .then((data) => data.Items.map(this.services.parseAlbum))
    }

    public async artists(): Promise<Artist[]> {
        return this.services
            .request('/Artists/AlbumArtists?sortBy=SortName&sortOrder=Ascending&recursive=true')
            .then((response) => response.json() as Promise<{ Items: JellyfinAPI.Artist[] }>)
            .then((data) => data.Items.map(this.services.parseArtist))
    }

    public async playlists(): Promise<Playlist[]> {
        return this.services
            .request(`/Users/${this.jellyfinUserId}/Items?sortBy=SortName&sortOrder=Ascending&includeItemTypes=Playlist&recursive=true`)
            .then((response) => response.json() as Promise<{ Items: JellyfinAPI.Playlist[] }>)
            .then((data) => data.Items.map(this.services.parsePlaylist))
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
