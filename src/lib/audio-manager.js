import { generateURL } from '$lib/Jellyfin-api'
import { USER_ID } from '$lib/Jellyfin-api'

const paramPresets = {
    default: {
        MaxStreamingBitrate: '999999999',
        Container: 'opus,webm|opus,mp3,aac,m4a|aac,m4b|aac,flac,webma,webm|webma,wav,ogg',
        TranscodingContainer: 'ts',
        TranscodingProtocol: 'hls',
        AudioCodec: 'aac',
        userId: USER_ID,
    },
}

export const buildAudioEndpoint = (id, params) => {
    return generateURL({
        type: 'Audio',
        pathParams: { id: id },
        queryParams: paramPresets[params],
    })
}
