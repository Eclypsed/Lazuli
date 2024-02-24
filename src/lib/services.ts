import { google } from 'googleapis'

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

export class YouTubeMusic {
    static baseHeaders = {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0',
        accept: '*/*',
        'accept-encoding': 'gzip, deflate',
        'content-type': 'application/json',
        'content-encoding': 'gzip',
        origin: 'https://music.youtube.com',
        Cookie: 'SOCS=CAI;',
    }

    static fetchServiceInfo = async (userId: string, accessToken: string): Promise<Connection<'youtube-music'>['service']> => {
        const youtube = google.youtube('v3')
        const userChannelResponse = await youtube.channels.list({ mine: true, part: ['snippet'], access_token: accessToken })
        const userChannel = userChannelResponse.data.items![0]

        return {
            userId,
            username: userChannel.snippet?.title as string,
            profilePicture: userChannel.snippet?.thumbnails?.default?.url as string | undefined,
        }
    }

    static getVisitorId = async (accessToken: string): Promise<string> => {
        const headers = Object.assign(this.baseHeaders, { authorization: `Bearer ${accessToken}`, 'X-Goog-Request-Time': `${Date.now()}` })
        const visitorIdResponse = await fetch('https://music.youtube.com', { headers })
        const visitorIdText = await visitorIdResponse.text()
        const regex = /ytcfg\.set\s*\(\s*({.+?})\s*\)\s*;/g
        const matches = []
        let match

        while ((match = regex.exec(visitorIdText)) !== null) {
            const capturedGroup = match[1]
            matches.push(capturedGroup)
        }

        let visitorId = ''
        if (matches.length > 0) {
            const ytcfg = JSON.parse(matches[0])
            visitorId = ytcfg.VISITOR_DATA
        }

        return visitorId
    }

    static getHome = async (accessToken: string) => {
        const headers = Object.assign(this.baseHeaders, { authorization: `Bearer ${accessToken}`, 'X-Goog-Request-Time': `${Date.now()}` })

        function formatDate(): string {
            const currentDate = new Date()
            const year = currentDate.getUTCFullYear()
            const month = (currentDate.getUTCMonth() + 1).toString().padStart(2, '0') // Months are zero-based, so add 1
            const day = currentDate.getUTCDate().toString().padStart(2, '0')

            return year + month + day
        }

        const response = await fetch(`https://music.youtube.com/youtubei/v1/browse?alt=json`, {
            headers,
            method: 'POST',
            body: JSON.stringify({
                browseId: 'FEmusic_home',
                context: {
                    client: {
                        clientName: 'WEB_REMIX',
                        clientVersion: '1.' + formatDate() + '.01.00',
                        hl: 'en',
                    },
                },
            }),
        })

        const data = await response.json()
        console.log(response.status)
        console.log(data.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].musicCarouselShelfRenderer.contents[0].musicTwoRowItemRenderer.title)
    }
}
