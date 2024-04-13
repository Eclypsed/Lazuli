export class Jellyfin implements Connection {
    public readonly id: string
    private readonly userId: string
    private readonly jfUserId: string
    private readonly serverUrl: string
    private readonly accessToken: string

    private readonly authHeader: Headers

    constructor(id: string, userId: string, jellyfinUserId: string, serverUrl: string, accessToken: string) {
        this.id = id
        this.userId = userId
        this.jfUserId = jellyfinUserId
        this.serverUrl = serverUrl
        this.accessToken = accessToken

        this.authHeader = new Headers({ Authorization: `MediaBrowser Token="${this.accessToken}"` })
    }

    public getConnectionInfo = async (): Promise<Extract<ConnectionInfo, { type: 'jellyfin' }>> => {
        const userUrl = new URL(`Users/${this.jfUserId}`, this.serverUrl)
        const systemUrl = new URL('System/Info', this.serverUrl)

        const userData: JellyfinAPI.User | undefined = await fetch(userUrl, { headers: this.authHeader })
            .then((response) => response.json())
            .catch(() => {
                console.error(`Fetch to ${userUrl.toString()} failed`)
                return undefined
            })
        const systemData: JellyfinAPI.System | undefined = await fetch(systemUrl, { headers: this.authHeader })
            .then((response) => response.json())
            .catch(() => {
                console.error(`Fetch to ${systemUrl.toString()} failed`)
                return undefined
            })

        return {
            id: this.id,
            userId: this.userId,
            type: 'jellyfin',
            serverUrl: this.serverUrl,
            serverName: systemData?.ServerName,
            jellyfinUserId: this.jfUserId,
            username: userData?.Name,
        }
    }

    public getRecommendations = async (): Promise<(Song | Album | Playlist)[]> => {
        const searchParams = new URLSearchParams({
            SortBy: 'PlayCount',
            SortOrder: 'Descending',
            IncludeItemTypes: 'Audio',
            Recursive: 'true',
            limit: '10',
        })

        const mostPlayedSongsURL = new URL(`/Users/${this.jfUserId}/Items?${searchParams.toString()}`, this.serverUrl)

        const mostPlayed: { Items: JellyfinAPI.Song[] } = await fetch(mostPlayedSongsURL, { headers: this.authHeader }).then((response) => response.json())

        return Array.from(mostPlayed.Items, (song) => this.parseSong(song))
    }

    public search = async (searchTerm: string, filter?: 'song' | 'album' | 'artist' | 'playlist'): Promise<(Song | Album | Playlist)[]> => {
        const searchParams = new URLSearchParams({
            searchTerm,
            includeItemTypes: 'Audio,MusicAlbum,Playlist', // Potentially add MusicArtist
            recursive: 'true',
        })

        const searchURL = new URL(`Users/${this.jfUserId}/Items?${searchParams.toString()}`, this.serverUrl)
        const searchResponse = await fetch(searchURL, { headers: this.authHeader })
        if (!searchResponse.ok) throw new JellyfinFetchError('Failed to search Jellyfin', searchResponse.status, searchURL.toString())
        const searchResults = (await searchResponse.json()).Items as (JellyfinAPI.Song | JellyfinAPI.Album | JellyfinAPI.Playlist)[] // JellyfinAPI.Artist

        const parsedResults: (Song | Album | Playlist)[] = Array.from(searchResults, (result) => {
            switch (result.Type) {
                case 'Audio':
                    return this.parseSong(result)
                case 'MusicAlbum':
                    return this.parseAlbum(result)
                case 'Playlist':
                    return this.parsePlaylist(result)
            }
        })
        return parsedResults
    }

    public getAudioStream = async (id: string, range: string | null): Promise<Response> => {
        const audoSearchParams = new URLSearchParams({
            MaxStreamingBitrate: '2000000',
            Container: 'opus,webm|opus,mp3,aac,m4a|aac,m4b|aac,flac,webma,webm|webma,wav,ogg',
            TranscodingContainer: 'ts',
            TranscodingProtocol: 'hls',
            AudioCodec: 'aac',
            userId: this.jfUserId,
        })

        const audioUrl = new URL(`Audio/${id}/universal?${audoSearchParams.toString()}`, this.serverUrl)

        const headers = new Headers(this.authHeader)
        headers.set('range', range || '0-')

        return await fetch(audioUrl, { headers })
    }

    private parseSong = (song: JellyfinAPI.Song): Song => {
        const thumbnail = song.ImageTags?.Primary
            ? new URL(`Items/${song.Id}/Images/Primary`, this.serverUrl).toString()
            : song.AlbumPrimaryImageTag
              ? new URL(`Items/${song.AlbumId}/Images/Primary`, this.serverUrl).toString()
              : undefined

        const artists: Song['artists'] = song.ArtistItems
            ? Array.from(song.ArtistItems, (artist) => {
                  return { id: artist.Id, name: artist.Name }
              })
            : undefined

        const album: Song['album'] = song.AlbumId && song.Album ? { id: song.AlbumId, name: song.Album } : undefined

        return {
            connection: this.id,
            type: 'song',
            id: song.Id,
            name: song.Name,
            duration: ticksToSeconds(song.RunTimeTicks),
            thumbnail,
            artists,
            album,
            releaseDate: song.ProductionYear?.toString(),
        }
    }

    private parseAlbum = (album: JellyfinAPI.Album): Album => {
        const thumbnail = album.ImageTags?.Primary ? new URL(`Items/${album.Id}/Images/Primary`, this.serverUrl).toString() : undefined

        const artists: Album['artists'] = album.AlbumArtists
            ? Array.from(album.AlbumArtists, (artist) => {
                  return { id: artist.Id, name: artist.Name }
              })
            : undefined

        return {
            connection: this.id,
            type: 'album',
            id: album.Id,
            name: album.Name,
            duration: ticksToSeconds(album.RunTimeTicks),
            thumbnail,
            artists,
            releaseDate: album.ProductionYear?.toString(),
        }
    }

    private parsePlaylist = (playlist: JellyfinAPI.Playlist): Playlist => {
        const thumbnail = playlist.ImageTags?.Primary ? new URL(`Items/${playlist.Id}/Images/Primary`, this.serverUrl).toString() : undefined

        return {
            connection: this.id,
            id: playlist.Id,
            name: playlist.Name,
            type: 'playlist',
            thumbnail,
        }
    }

    public static authenticateByName = async (username: string, password: string, serverUrl: URL, deviceId: string): Promise<JellyfinAPI.AuthData> => {
        const authUrl = new URL('/Users/AuthenticateByName', serverUrl.origin).toString()
        return fetch(authUrl, {
            method: 'POST',
            body: JSON.stringify({
                Username: username,
                Pw: password,
            }),
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'X-Emby-Authorization': `MediaBrowser Client="Lazuli", Device="Chrome", DeviceId="${deviceId}", Version="1.0.0.0"`,
            },
        })
            .catch(() => {
                throw new JellyfinFetchError('Could not reach Jellyfin Server', 400, authUrl)
            })
            .then((response) => {
                if (!response.ok) throw new JellyfinFetchError('Failed to Authenticate', 401, authUrl)
                return response.json() as Promise<JellyfinAPI.AuthData>
            })
    }
}

const ticksToSeconds = (ticks: number): number => Math.floor(ticks / 10000)

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
    interface User {
        Name: string
        Id: string
    }

    interface AuthData {
        User: JellyfinAPI.User
        AccessToken: string
    }

    interface System {
        ServerName: string
    }

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

    type Artist = {
        Name: string
        Id: string
        Type: 'MusicArtist'
        ImageTags?: {
            Primary?: string
        }
    }
}
