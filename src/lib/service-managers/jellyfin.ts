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

    static songFactory = (song: Jellyfin.Song, connection: Connection): Song => {
        const { id, service } = connection
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
            serviceType: service.type,
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

    static albumFactory = (album: Jellyfin.Album, connection: Connection): Album => {
        const { id, service } = connection
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
            serviceType: service.type,
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

    static playListFactory = (playlist: Jellyfin.Playlist, connection: Connection): Playlist => {
        const { id, service } = connection
        const thumbnail = playlist.ImageTags?.Primary ? new URL(`Items/${playlist.Id}/Images/Primary`, service.urlOrigin).href : undefined

        return {
            connectionId: id,
            serviceType: service.type,
            type: 'playlist',
            id: playlist.Id,
            name: playlist.Name,
            duration: Math.floor(playlist.RunTimeTicks / 10000),
            thumbnail,
        }
    }

    static artistFactory = (artist: Jellyfin.Artist, connection: Connection): Artist => {
        const { id, service } = connection
        const thumbnail = artist.ImageTags?.Primary ? new URL(`Items/${artist.Id}/Images/Primary`, service.urlOrigin).href : undefined

        return {
            connectionId: id,
            serviceType: service.type,
            type: 'artist',
            id: artist.Id,
            name: artist.Name,
            thumbnail,
        }
    }
}
