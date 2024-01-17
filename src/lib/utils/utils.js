import Joi from 'joi'

export const getVolume = () => {
    const currentVolume = localStorage.getItem('volume')
    if (currentVolume) return Number(currentVolume)

    const defaultVolume = 100
    localStorage.setItem('volume', defaultVolume)
    return defaultVolume
}

export const setVolume = (volume) => {
    if (Number.isFinite(volume)) localStorage.setItem('volume', Math.round(volume))
}

export class JellyfinUtils {
    static #AUDIO_PRESETS = {
        default: {
            MaxStreamingBitrate: 999999999,
            Container: 'opus,webm|opus,mp3,aac,m4a|aac,m4b|aac,flac,webma,webm|webma,wav,ogg',
            TranscodingContainer: 'ts',
            TranscodingProtocol: 'hls',
            AudioCodec: 'aac',
            // userId: REMEMBER TO ADD THIS TO THE END,
        },
    }

    static mediaItemFactory = (itemData, connectionData) => {
        const generalItemSchema = Joi.object({
            ServerId: Joi.string().required(),
            Type: Joi.string().required(),
        }).unknown(true)

        const generalItemValidation = generalItemSchema.validate(itemData)
        if (generalItemValidation.error) throw new Error(generalItemValidation.error.message)

        switch (itemData.Type) {
            case 'Audio':
                return this.songFactory(itemData, connectionData)
            case 'MusicAlbum':
                break
        }
    }

    static songFactory = (songData, connectionData) => {
        const { id, serviceType, serviceUserId, serviceUrl } = connectionData

        const songSchema = Joi.object({
            Name: Joi.string().required(),
            Id: Joi.string().required(),
            RunTimeTicks: Joi.number().required(),
        }).unknown(true)

        const songValidation = songSchema.validate(songData)
        if (songValidation.error) throw new Error(songValidation.error.message)

        const artistData = songData?.ArtistItems
            ? Array.from(songData.ArtistItems, (artist) => {
                  return { name: artist.Name, id: artist.Id }
              })
            : null

        const albumData = songData?.AlbumId
            ? {
                  name: songData.Album,
                  id: songData.AlbumId,
                  artists: songData.AlbumArtists,
                  image: songData?.AlbumPrimaryImageTag ? new URL(`Items/${songData.AlbumId}/Images/Primary`, serviceUrl).href : null,
              }
            : null

        const imageSource = songData?.ImageTags?.Primary ? new URL(`Items/${songData.Id}/Images/Primary`, serviceUrl).href : albumData?.image

        const audioSearchParams = new URLSearchParams(this.#AUDIO_PRESETS.default)
        audioSearchParams.append('userId', serviceUserId)
        const audoSource = new URL(`Audio/${songData.Id}/universal?${audioSearchParams.toString()}`, serviceUrl).href

        return {
            connectionId: id,
            serviceType,
            mediaType: 'song',
            name: songData.Name,
            id: songData.Id,
            duration: Math.floor(songData.RunTimeTicks / 10000), // <-- Converts 'ticks' (whatever that means) to milliseconds, a sane unit of measure
            artists: artistData,
            album: albumData,
            image: imageSource,
            audio: audoSource,
            video: null,
            releaseDate: songData?.ProductionYear,
        }
    }

    static getLocalDeviceUUID = () => {
        const existingUUID = localStorage.getItem('lazuliDeviceUUID')

        if (!existingUUID) {
            const newUUID = '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16))
            localStorage.setItem('lazuliDeviceUUID', newUUID)
            return newUUID
        }

        return existingUUID
    }
}

export class YouTubeMusicUtils {
    static mediaItemFactory = () => {}
}
