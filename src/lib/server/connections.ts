import { DB } from './db'
import { Jellyfin } from './jellyfin'
import { YouTubeMusic } from './youtube-music'

const constructConnection = (connectionInfo: ReturnType<typeof DB.getConnectionInfo>): Connection | undefined => {
    if (!connectionInfo) return undefined

    const { id, userId, type, service, tokens } = connectionInfo
    switch (type) {
        case 'jellyfin':
            return new Jellyfin(id, userId, service.userId, service.serverUrl, tokens.accessToken)
        case 'youtube-music':
            return new YouTubeMusic(id, userId, service.userId, tokens.accessToken, tokens.refreshToken, tokens.expiry)
    }
}
function getConnection(id: string): Connection | undefined {
    return constructConnection(DB.getConnectionInfo(id))
}

const getUserConnections = (userId: string): Connection[] | undefined => {
    return DB.getUserConnectionInfo(userId)?.map((info) => constructConnection(info)!)
}

export const Connections = {
    getConnection,
    getUserConnections,
}
