import { DB, type Schemas } from './db'
import { Jellyfin } from './jellyfin'
import { YouTubeMusic } from './youtube-music'

export async function userExists(userId: string): Promise<boolean> {
    return Boolean(await DB.users.where('id', userId).first(DB.db.raw('EXISTS(SELECT 1)')))
}

export async function mixExists(mixId: string): Promise<Boolean> {
    return Boolean(await DB.mixes.where('id', mixId).first(DB.db.raw('EXISTS(SELECT 1)')))
}

function connectionBuilder(schema: Schemas.Connections): Connection {
    const { id, userId, type, serviceUserId, accessToken } = schema
    switch (type) {
        case 'jellyfin':
            return new Jellyfin(id, userId, serviceUserId, schema.serverUrl, accessToken)
        case 'youtube-music':
            return new YouTubeMusic(id, userId, serviceUserId, accessToken, schema.refreshToken, schema.expiry)
    }
}

/**
 * Queries the database for a specific connection.
 *
 * @param id The id of the connection
 * @returns An instance of a Connection
 * @throws ReferenceError if there is no connection with an id matches the one passed
 */
export async function buildConnection(id: string): Promise<Connection> {
    const schema = await DB.connections.where('id', id).first()
    if (!schema) throw ReferenceError(`Connection of Id ${id} does not exist`)

    return connectionBuilder(schema)
}

/**
 * Queries the database for all connections belong to a user of the specified id.
 *
 * @param userId The id of a user
 * @returns An array of connection instances for each of the user's connections
 * @throws ReferenceError if there is no user with an id matches the one passed
 */
export async function buildUserConnections(userId: string): Promise<Connection[]> {
    if (!(await userExists(userId))) throw ReferenceError(`User of Id ${userId} does not exist`)

    return (await DB.connections.where('userId', userId).select('*')).map(connectionBuilder)
}
