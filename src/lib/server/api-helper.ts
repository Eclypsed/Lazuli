import { DB, type Schemas } from './db'
import { Jellyfin } from './jellyfin'
import { YouTubeMusic } from './youtube-music'

export async function userExists(userId: string): Promise<boolean> {
    return Boolean(await DB.users.where('id', userId).first(DB.db.raw('EXISTS(SELECT 1)')))
}

export async function connectionExists(connectionId: string): Promise<boolean> {
    return Boolean(await DB.connections.where('id', connectionId).first(DB.db.raw('EXISTS(SELECT 1)')))
}

export async function mixExists(mixId: string): Promise<boolean> {
    return Boolean(await DB.mixes.where('id', mixId).first(DB.db.raw('EXISTS(SELECT 1)')))
}

export class ConnectionFactory {
    /**
     * Queries the database for a specific connection.
     *
     * @param {string} id The id of the connection
     * @returns {Promise<Connection>} An instance of a Connection
     * @throws {ReferenceError} ReferenceError if there is no connection with an id matches the one passed
     */
    public static async getConnection(id: string): Promise<Connection> {
        const schema = await DB.connections.where('id', id).first()
        if (!schema) throw ReferenceError(`Connection of Id ${id} does not exist`)

        return this.createConnection(schema)
    }

    /**
     * Queries the database for all connections belong to a user of the specified id.
     *
     * @param {string} userId The id of a user
     * @returns {Promise<Connection[]>} An array of connection instances for each of the user's connections
     * @throws {ReferenceError} ReferenceError if there is no user with an id matches the one passed
     */
    public static async getUserConnections(userId: string): Promise<Connection[]> {
        const validUserId = await userExists(userId)
        if (!validUserId) throw ReferenceError(`User of Id ${userId} does not exist`)

        const connectionSchemas = await DB.connections.where('userId', userId).select('*')
        return connectionSchemas.map(this.createConnection)
    }

    private static createConnection(schema: Schemas.Connections): Connection {
        const { id, userId, type, serviceUserId, accessToken } = schema
        switch (type) {
            case 'jellyfin':
                return new Jellyfin(id, userId, serviceUserId, schema.serverUrl, accessToken)
            case 'youtube-music':
                return new YouTubeMusic(id, userId, serviceUserId, accessToken, schema.refreshToken, schema.expiry)
        }
    }
}
