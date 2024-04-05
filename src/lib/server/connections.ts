import { DB, type ConnectionRow } from './db'
import { Jellyfin } from './jellyfin'
import { YouTubeMusic } from './youtube-music'

const constructConnection = (connectionInfo: ConnectionRow): Connection => {
    const { id, userId, type, service, tokens } = connectionInfo
    switch (type) {
        case 'jellyfin':
            return new Jellyfin(id, userId, service.userId, service.serverUrl, tokens.accessToken)
        case 'youtube-music':
            return new YouTubeMusic(id, userId, service.userId, tokens.accessToken, tokens.refreshToken, tokens.expiry)
    }
}

const getConnections = (ids: string[]): Connection[] => {
    const connectionInfo = DB.getConnectionInfo(ids)

    return Array.from(connectionInfo, (info) => constructConnection(info))
}

const getUserConnections = (userId: string): Connection[] => {
    const connectionInfo = DB.getUserConnectionInfo(userId)

    return Array.from(connectionInfo, (info) => constructConnection(info))
}

export const Connections = {
    getConnections,
    getUserConnections,
}
