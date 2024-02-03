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

    static mediaItemFactory = (item: Jellyfin.MediaItem, connection: Connection): MediaItem => {}

    static songFactory = (song: Jellyfin.Song, connection: Connection): Song => {
        const { id, service } = connection

        const artists: Artist[] | undefined = song.ArtistItems
            ? Array.from(song.ArtistItems, (artist) => {
                  return { name: artist.Name, id: artist.Id }
              })
            : undefined

        const thumbnail = song.ImageTags?.Primary ? new URL(`Items/${song.Id}/Images/Primary`, service.urlOrigin).href : song.AlbumPrimaryImageTag ? new URL(`Items/${song.AlbumId}/Images/Primary`).href : undefined

        const audoSearchParams = new URLSearchParams(this.audioPresets(service.userId))
        const audioSource = new URL(`Audio/${song.Id}/universal?${audoSearchParams.toString()}`, service.urlOrigin).href

        const factorySong: Song = {
            connection,
            id: song.Id,
            name: song.Name,
            duration: Math.floor(song.RunTimeTicks / 10000),
            thumbnail,
            artists,
            albumId: song.AlbumId,
            audio: audioSource,
            releaseDate: String(song.ProductionYear),
        }
        return factorySong
    }
}
