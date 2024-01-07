export const ticksToTime = (ticks) => {
    const totalSeconds = ~~(ticks / 10000000)
    const totalMinutes = ~~(totalSeconds / 60)
    const hours = ~~(totalMinutes / 60)

    const remainderMinutes = totalMinutes - hours * 60
    const remainderSeconds = totalSeconds - totalMinutes * 60

    const format = (value) => {
        return value < 10 ? `0${value}` : value
    }

    if (hours > 0) {
        return `${hours}:${format(remainderMinutes)}:${format(remainderSeconds)}`
    } else {
        return `${remainderMinutes}:${format(remainderSeconds)}`
    }
}

export class JellyfinUtils {
    static #ROOT_URL = 'http://eclypsecloud:8096/'
    static #API_KEY = 'fd4bf4c18e5f4bb08c2cb9f6a1542118'
    static #USER_ID = '7364ce5928c64b90b5765e56ca884053'
    static #AUDIO_PRESETS = {
        default: {
            MaxStreamingBitrate: '999999999',
            Container: 'opus,webm|opus,mp3,aac,m4a|aac,m4b|aac,flac,webma,webm|webma,wav,ogg',
            TranscodingContainer: 'ts',
            TranscodingProtocol: 'hls',
            AudioCodec: 'aac',
            userId: this.#USER_ID,
        },
    }

    static #buildUrl(baseURL, queryParams) {
        const queryParamList = queryParams ? Object.entries(queryParams).map(([key, value]) => `${key}=${value}`) : []
        queryParamList.push(`api_key=${this.#API_KEY}`)
        return baseURL.concat('?' + queryParamList.join('&'))
    }

    static getItemsEnpt(itemParams) {
        const baseUrl = this.#ROOT_URL + `Users/${this.#USER_ID}/Items`
        const endpoint = this.#buildUrl(baseUrl, itemParams)
        return endpoint
    }

    static getImageEnpt(id, imageParams) {
        const baseUrl = this.#ROOT_URL + `Items/${id}/Images/Primary`
        const endpoint = this.#buildUrl(baseUrl, imageParams)
        return endpoint
    }

    static getAudioEnpt(id, audioPreset) {
        const baseUrl = this.#ROOT_URL + `Audio/${id}/universal`
        const presetParams = this.#AUDIO_PRESETS[audioPreset]
        const endpoint = this.#buildUrl(baseUrl, presetParams)
        return endpoint
    }

    static getLocalDeviceUUID() {
        const existingUUID = localStorage.getItem('lazuliDeviceUUID')

        if (!existingUUID) {
            const newUUID = '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16))
            localStorage.setItem('lazuliDeviceUUID', newUUID)
            return newUUID
        }

        return existingUUID
    }
}
