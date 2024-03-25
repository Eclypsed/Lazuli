export class Jellyfin implements Connection {
    private id: string
    private userId: string
    private jfUserId: string
    private serverUrl: string
    private accessToken: string

    constructor(id: string, userId: string, jellyfinUserId: string, serverUrl: string, accessToken: string) {
        this.id = id
        this.userId = userId
        this.jfUserId = jellyfinUserId
        this.serverUrl = serverUrl
        this.accessToken = accessToken
    }

    // const audoSearchParams = new URLSearchParams({
    //     MaxStreamingBitrate: '999999999',
    //     Container: 'opus,webm|opus,mp3,aac,m4a|aac,m4b|aac,flac,webma,webm|webma,wav,ogg',
    //     TranscodingContainer: 'ts',
    //     TranscodingProtocol: 'hls',
    //     AudioCodec: 'aac',
    //     userId: this.jfUserId,
    // })

    public getConnectionInfo = async (): Promise<Extract<ConnectionInfo, { type: 'jellyfin' }>> => {
        const reqHeaders = new Headers({ Authorization: `MediaBrowser Token="${this.accessToken}"` })

        const userUrl = new URL(`Users/${this.jfUserId}`, this.serverUrl).href
        const systemUrl = new URL('System/Info', this.serverUrl).href

        const userResponse = await fetch(userUrl, { headers: reqHeaders })
        const systemResponse = await fetch(systemUrl, { headers: reqHeaders })

        const userData: JellyfinAPI.User = await userResponse.json()
        const systemData: JellyfinAPI.System = await systemResponse.json()

        return {
            id: this.id,
            userId: this.userId,
            type: 'jellyfin',
            serviceInfo: {
                userId: this.jfUserId,
                urlOrigin: this.serverUrl,
                username: userData.Name,
                serverName: systemData.ServerName,
            },
            tokens: {
                accessToken: this.accessToken,
            },
        }
    }

    public getRecommendations = async (): Promise<MediaItem[]> => {
        const mostPlayedSongsSearchParams = new URLSearchParams({
            SortBy: 'PlayCount',
            SortOrder: 'Descending',
            IncludeItemTypes: 'Audio',
            Recursive: 'true',
            limit: '10',
        })

        const mostPlayedSongsURL = new URL(`/Users/${this.jfUserId}/Items?${mostPlayedSongsSearchParams.toString()}`, this.serverUrl).href
        const requestHeaders = new Headers({ Authorization: `MediaBrowser Token="${this.accessToken}"` })

        const mostPlayedResponse = await fetch(mostPlayedSongsURL, { headers: requestHeaders })
        const mostPlayedData = await mostPlayedResponse.json()

        return Array.from(mostPlayedData.Items as JellyfinAPI.Song[], (song) => this.songFactory(song))
    }

    private songFactory = (song: JellyfinAPI.Song): Song => {
        const thumbnail = song.ImageTags?.Primary
            ? new URL(`Items/${song.Id}/Images/Primary`, this.serverUrl).href
            : song.AlbumPrimaryImageTag
              ? new URL(`Items/${song.AlbumId}/Images/Primary`, this.serverUrl).href
              : undefined

        const artists = song.ArtistItems
            ? Array.from(song.ArtistItems, (artist) => {
                  return { id: artist.Id, name: artist.Name }
              })
            : []

        // Add Album details

        return {
            connection: {
                id: this.id,
                type: 'jellyfin',
            },
            type: 'song',
            id: song.Id,
            name: song.Name,
            duration: Math.floor(song.RunTimeTicks / 10000),
            thumbnail,
            artists,
            releaseDate: String(song.ProductionYear),
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

    interface MediaItem {
        Name: string
        Id: string
        Type: 'Audio' | 'MusicAlbum' | 'Playlist' | 'MusicArtist'
        ImageTags?: {
            Primary?: string
        }
    }

    interface Song extends JellyfinAPI.MediaItem {
        RunTimeTicks: number
        ProductionYear: number
        Type: 'Audio'
        ArtistItems: {
            Name: string
            Id: string
        }[]
        Album?: string
        AlbumId?: string
        AlbumPrimaryImageTag?: string
        AlbumArtists: {
            Name: string
            Id: string
        }[]
    }

    interface Album extends JellyfinAPI.MediaItem {
        RunTimeTicks: number
        ProductionYear: number
        Type: 'MusicAlbum'
        ArtistItems: {
            Name: string
            Id: string
        }[]
        AlbumArtists: {
            Name: string
            Id: string
        }[]
    }

    interface Playlist extends JellyfinAPI.MediaItem {
        RunTimeTicks: number
        Type: 'Playlist'
        ChildCount: number
    }

    interface Artist extends JellyfinAPI.MediaItem {
        Type: 'MusicArtist'
    }
}
