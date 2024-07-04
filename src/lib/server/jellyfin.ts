import { PUBLIC_VERSION } from '$env/static/public'
import type { JellyfinAPI } from './jellyfin-types'
import ky, { HTTPError, type KyInstance } from 'ky'

const jellyfinLogo = 'https://raw.githubusercontent.com/jellyfin/jellyfin-ux/55616553b692b1a6c7d8e786eeb7d8216e9b50df/branding/SVG/icon-transparent.svg'

export class Jellyfin implements Connection {
    public readonly id: string
    private readonly userId: string
    private readonly jellyfinUserId: string
    private readonly serverUrl: string

    private readonly parsers: JellyfinParsers
    private libraryManager?: JellyfinLibraryManager

    private readonly api: KyInstance

    constructor(id: string, userId: string, jellyfinUserId: string, serverUrl: string, accessToken: string) {
        this.id = id
        this.userId = userId
        this.jellyfinUserId = jellyfinUserId
        this.serverUrl = serverUrl

        this.parsers = new JellyfinParsers(this.id, serverUrl)

        const errorHook = (error: HTTPError) => {
            console.error(`Request to ${new URL(error.request.url).pathname} failed: ${error.message} ${error.response.status}`)
            return error
        }

        this.api = ky.create({
            prefixUrl: serverUrl,
            headers: { Authorization: `MediaBrowser Token="${accessToken}"` },
            hooks: { beforeError: [errorHook] },
        })
    }

    public get library() {
        if (!this.libraryManager) this.libraryManager = new JellyfinLibraryManager(this.jellyfinUserId, this.api, this.parsers)

        return this.libraryManager
    }

    // * This method can NOT throw an error
    public async getConnectionInfo() {
        const getUserData = () =>
            this.api(`Users/${this.jellyfinUserId}`)
                .json<JellyfinAPI.UserResponse>()
                .catch(() => null)
        const getSystemData = () =>
            this.api('System/Info')
                .json<JellyfinAPI.SystemResponse>()
                .catch(() => null)

        const [userData, systemData] = await Promise.all([getUserData(), getSystemData()])

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

    public async search<T extends keyof MediaItemTypeMap>(searchTerm: string, types: Set<T>): Promise<MediaItemTypeMap[T][]> {
        const filterMap = { song: 'Audio', album: 'MusicAlbum', artist: 'MusicArtist', playlist: 'Playlist' } as const

        const searchParams = new URLSearchParams({
            searchTerm,
            includeItemTypes: Array.from(types, (type) => filterMap[type]).join(','),
            recursive: 'true',
        })

        const searchResults = await this.api(`Users/${this.jellyfinUserId}/Items?${searchParams.toString()}`).json<{ Items: (JellyfinAPI.Song | JellyfinAPI.Album | JellyfinAPI.Artist | JellyfinAPI.Playlist)[] }>()

        return searchResults.Items.map((result) => {
            switch (result.Type) {
                case 'Audio':
                    return this.parsers.parseSong(result)
                case 'MusicAlbum':
                    return this.parsers.parseAlbum(result)
                case 'MusicArtist':
                    return this.parsers.parseArtist(result)
                case 'Playlist':
                    return this.parsers.parsePlaylist(result)
            }
        }) as MediaItemTypeMap[T][]
    }

    // Temporary implementation, I'll actually make something better later
    public async getRecommendations(): Promise<(Song | Album | Artist | Playlist)[]> {
        const searchParams = new URLSearchParams({
            SortBy: 'PlayCount',
            SortOrder: 'Descending',
            IncludeItemTypes: 'Audio',
            Recursive: 'true',
            limit: '10',
        })

        const mostPlayedResponse = await this.api(`Users/${this.jellyfinUserId}/Items?${searchParams.toString()}`).json<{ Items: JellyfinAPI.Song[] }>()

        return mostPlayedResponse.Items.map(this.parsers.parseSong)
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

        return this.api(`Audio/${id}/universal?${audoSearchParams.toString()}`, { headers, keepalive: true })
    }

    public async getAlbum(id: string) {
        return this.api(`Users/${this.jellyfinUserId}/Items/${id}`).json<JellyfinAPI.Album>().then(this.parsers.parseAlbum)
    }

    public async getAlbumItems(id: string) {
        const searchParams = new URLSearchParams({
            parentId: id,
            sortBy: 'ParentIndexNumber,IndexNumber,SortName',
        })

        return this.api(`Users/${this.jellyfinUserId}/Items?${searchParams.toString()}`)
            .json<{ Items: JellyfinAPI.Song[] }>()
            .then((response) => response.Items.map(this.parsers.parseSong))
    }

    public async getPlaylist(id: string) {
        return this.api(`Users/${this.jellyfinUserId}/Items/${id}`).json<JellyfinAPI.Playlist>().then(this.parsers.parsePlaylist)
    }

    public async getPlaylistItems(id: string, options?: { startIndex?: number; limit?: number }) {
        const searchParams = new URLSearchParams({
            parentId: id,
            includeItemTypes: 'Audio',
        })

        if (options?.startIndex) searchParams.append('startIndex', options.startIndex.toString())
        if (options?.limit) searchParams.append('limit', options.limit.toString())

        return this.api(`Users/${this.jellyfinUserId}/Items?${searchParams.toString()}`)
            .json<{ Items: JellyfinAPI.Song[] }>()
            .then((response) => response.Items.map(this.parsers.parseSong))
    }

    public static async authenticateByName(username: string, password: string, serverUrl: URL, deviceId: string): Promise<JellyfinAPI.AuthenticationResponse> {
        return ky
            .post(new URL('Users/AuthenticateByName', serverUrl.origin), {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'X-Emby-Authorization': `MediaBrowser Client="Lazuli", Device="Chrome", DeviceId="${deviceId}", Version="${PUBLIC_VERSION}"`,
                },
                json: {
                    Username: username,
                    Pw: password,
                },
            })
            .json<JellyfinAPI.AuthenticationResponse>()
    }
}

class JellyfinParsers {
    private readonly connectionId: string
    private readonly serverUrl: string

    constructor(connectionId: string, serverUrl: string) {
        this.connectionId = connectionId
        this.serverUrl = serverUrl
    }

    private getBestThumbnail(item: JellyfinAPI.Song | JellyfinAPI.Album | JellyfinAPI.Artist | JellyfinAPI.Playlist, placeholder: string): string
    private getBestThumbnail(item: JellyfinAPI.Song | JellyfinAPI.Album | JellyfinAPI.Artist | JellyfinAPI.Playlist, placeholder?: string): string | undefined
    private getBestThumbnail(item: JellyfinAPI.Song | JellyfinAPI.Album | JellyfinAPI.Artist | JellyfinAPI.Playlist, placeholder?: string): string | undefined {
        const imageItemId = item.ImageTags?.Primary ? item.Id : 'AlbumPrimaryImageTag' in item && item.AlbumPrimaryImageTag ? item.AlbumId : undefined
        return imageItemId ? new URL(`Items/${imageItemId}/Images/Primary`, this.serverUrl).toString() : placeholder
    }

    public parseSong = (song: JellyfinAPI.Song): Song => ({
        connection: { id: this.connectionId, type: 'jellyfin' },
        id: song.Id,
        name: song.Name,
        type: 'song',
        duration: Math.round(song.RunTimeTicks / 10000000),
        thumbnailUrl: this.getBestThumbnail(song, jellyfinLogo),
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
        thumbnailUrl: this.getBestThumbnail(album, jellyfinLogo),
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
        thumbnailUrl: this.getBestThumbnail(playlist, jellyfinLogo),
    })
}

class JellyfinLibraryManager {
    private readonly jellyfinUserId: string
    private readonly api: KyInstance
    private readonly parsers: JellyfinParsers

    constructor(jellyfinUserId: string, api: KyInstance, parsers: JellyfinParsers) {
        this.jellyfinUserId = jellyfinUserId
        this.api = api
        this.parsers = parsers
    }

    public async albums(): Promise<Album[]> {
        return this.api(`Users/${this.jellyfinUserId}/Items?sortBy=SortName&sortOrder=Ascending&includeItemTypes=MusicAlbum&recursive=true`)
            .json<{ Items: JellyfinAPI.Album[] }>()
            .then((response) => response.Items.map(this.parsers.parseAlbum))
    }

    public async artists(): Promise<Artist[]> {
        // ? This returns just album artists instead of all artists like in finamp, but I might decide that I want to return all artists instead
        return this.api('Artists/AlbumArtists?sortBy=SortName&sortOrder=Ascending&recursive=true')
            .json<{ Items: JellyfinAPI.Artist[] }>()
            .then((response) => response.Items.map(this.parsers.parseArtist))
    }

    public async playlists(): Promise<Playlist[]> {
        return this.api(`Users/${this.jellyfinUserId}/Items?sortBy=SortName&sortOrder=Ascending&includeItemTypes=Playlist&recursive=true`)
            .json<{ Items: JellyfinAPI.Playlist[] }>()
            .then((response) => response.Items.map(this.parsers.parsePlaylist))
    }
}
