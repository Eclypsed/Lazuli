import { DB } from './db'
import { Jellyfin } from './jellyfin'
import { YouTubeMusic } from './youtube-music'

const constructConnection = (connectionInfo: ConnectionInfo): Connection => {
    const { id, userId, type, serviceInfo, tokens } = connectionInfo
    switch (type) {
        case 'jellyfin':
            return new Jellyfin(id, userId, serviceInfo.userId, serviceInfo.urlOrigin, tokens.accessToken)
        case 'youtube-music':
            return new YouTubeMusic(id, userId, serviceInfo.userId, tokens)
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
