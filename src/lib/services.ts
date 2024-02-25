export class Jellyfin {
    static audioPresets = (userId: string) => {
        return {
            MaxStreamingBitrate: '999999999',
            Container: 'opus,webm|opus,mp3,aac,m4a|aac,m4b|aac,flac,webma,webm|webma,wav,ogg',
            TranscodingContainer: 'ts',
            TranscodingProtocol: 'hls',
            AudioCodec: 'aac',
            userId,
        }
    }

    static fetchSerivceInfo = async (userId: string, urlOrigin: string, accessToken: string): Promise<Connection<'jellyfin'>['service']> => {
        const reqHeaders = new Headers({ Authorization: `MediaBrowser Token="${accessToken}"` })

        const userUrl = new URL(`Users/${userId}`, urlOrigin).href
        const systemUrl = new URL('System/Info', urlOrigin).href

        const userResponse = await fetch(userUrl, { headers: reqHeaders })
        const systemResponse = await fetch(systemUrl, { headers: reqHeaders })

        const userData: Jellyfin.User = await userResponse.json()
        const systemData: Jellyfin.System = await systemResponse.json()

        return {
            userId,
            urlOrigin,
            username: userData.Name,
            serverName: systemData.ServerName,
        }
    }

    static songFactory = (song: Jellyfin.Song, connection: Connection<'jellyfin'>): Song => {
        const { id, type, service } = connection
        const thumbnail = song.ImageTags?.Primary
            ? new URL(`Items/${song.Id}/Images/Primary`, service.urlOrigin).href
            : song.AlbumPrimaryImageTag
              ? new URL(`Items/${song.AlbumId}/Images/Primary`, service.urlOrigin).href
              : undefined

        const artists = song.ArtistItems
            ? Array.from(song.ArtistItems, (artist) => {
                  return { id: artist.Id, name: artist.Name }
              })
            : []

        const audoSearchParams = new URLSearchParams(this.audioPresets(service.userId))
        const audioSource = new URL(`Audio/${song.Id}/universal?${audoSearchParams.toString()}`, service.urlOrigin).href

        return {
            connectionId: id,
            serviceType: type,
            type: 'song',
            id: song.Id,
            name: song.Name,
            duration: Math.floor(song.RunTimeTicks / 10000),
            thumbnail,
            artists,
            albumId: song.AlbumId,
            audio: audioSource,
            releaseDate: String(song.ProductionYear),
        }
    }

    static albumFactory = (album: Jellyfin.Album, connection: Connection<'jellyfin'>): Album => {
        const { id, type, service } = connection
        const thumbnail = album.ImageTags?.Primary ? new URL(`Items/${album.Id}/Images/Primary`, service.urlOrigin).href : undefined

        const albumArtists = album.AlbumArtists
            ? Array.from(album.AlbumArtists, (artist) => {
                  return { id: artist.Id, name: artist.Name }
              })
            : []

        const artists = album.ArtistItems
            ? Array.from(album.ArtistItems, (artist) => {
                  return { id: artist.Id, name: artist.Name }
              })
            : []

        return {
            connectionId: id,
            serviceType: type,
            type: 'album',
            id: album.Id,
            name: album.Name,
            duration: Math.floor(album.RunTimeTicks / 10000),
            thumbnail,
            albumArtists,
            artists,
            releaseDate: String(album.ProductionYear),
        }
    }

    static playListFactory = (playlist: Jellyfin.Playlist, connection: Connection<'jellyfin'>): Playlist => {
        const { id, type, service } = connection
        const thumbnail = playlist.ImageTags?.Primary ? new URL(`Items/${playlist.Id}/Images/Primary`, service.urlOrigin).href : undefined

        return {
            connectionId: id,
            serviceType: type,
            type: 'playlist',
            id: playlist.Id,
            name: playlist.Name,
            duration: Math.floor(playlist.RunTimeTicks / 10000),
            thumbnail,
        }
    }

    static artistFactory = (artist: Jellyfin.Artist, connection: Connection<'jellyfin'>): Artist => {
        const { id, type, service } = connection
        const thumbnail = artist.ImageTags?.Primary ? new URL(`Items/${artist.Id}/Images/Primary`, service.urlOrigin).href : undefined

        return {
            connectionId: id,
            serviceType: type,
            type: 'artist',
            id: artist.Id,
            name: artist.Name,
            thumbnail,
        }
    }
}
