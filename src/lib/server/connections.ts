import { DB, type DBConnectionInfo } from './db'
import { Jellyfin, type JellyfinConnectionInfo } from './jellyfin'
import { YouTubeMusic, type YouTubeMusicConnectionInfo } from './youtube-music'

export type ConnectionInfo = JellyfinConnectionInfo | YouTubeMusicConnectionInfo

const constructConnection = (connectionInfo: DBConnectionInfo): Connection => {
    const { id, userId, type, service, tokens } = connectionInfo
    switch (type) {
        case 'jellyfin':
            return new Jellyfin(id, userId, service.userId, service.urlOrigin, tokens.accessToken)
        case 'youtube-music':
            return new YouTubeMusic(id, userId, service.userId, tokens)
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
