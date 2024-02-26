import Database from 'better-sqlite3'
import { generateUUID } from '$lib/utils'

const db = new Database('./src/lib/server/users.db', { verbose: console.info })
db.pragma('foreign_keys = ON')
const initUsersTable = `CREATE TABLE IF NOT EXISTS Users(
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(30) UNIQUE NOT NULL,
    passwordHash VARCHAR(72) NOT NULL
)`
const initConnectionsTable = `CREATE TABLE IF NOT EXISTS Connections(
    id VARCHAR(36) PRIMARY KEY,
    userId VARCHAR(36) NOT NULL,
    type VARCHAR(36) NOT NULL,
    service TEXT,
    tokens TEXT,
    FOREIGN KEY(userId) REFERENCES Users(id)
)`
db.exec(initUsersTable), db.exec(initConnectionsTable)

interface ConnectionsTableSchema {
    id: string
    userId: string
    type: serviceType
    service?: string
    tokens?: string
}

export class Users {
    static getUser = (id: string): User | null => {
        const user = db.prepare(`SELECT * FROM Users WHERE id = ?`).get(id) as User | null
        return user
    }

    static getUsername = (username: string): User | null => {
        const user = db.prepare(`SELECT * FROM Users WHERE lower(username) = ?`).get(username.toLowerCase()) as User | null
        return user
    }

    static addUser = (username: string, passwordHash: string): User | null => {
        if (this.getUsername(username)) return null

        const userId = generateUUID()
        db.prepare(`INSERT INTO Users(id, username, passwordHash) VALUES(?, ?, ?)`).run(userId, username, passwordHash)
        return this.getUser(userId)!
    }

    static deleteUser = (id: string): void => {
        const commandInfo = db.prepare(`DELETE FROM Users WHERE id = ?`).run(id)
        if (commandInfo.changes === 0) throw new Error(`User with id ${id} does not exist`)
    }
}

type DBConnectionData<T extends serviceType> = T extends 'jellyfin'
    ? Omit<Jellyfin.Connection, 'service'> & { service: Pick<Jellyfin.Connection['service'], 'userId' | 'urlOrigin'> }
    : T extends 'youtube-music'
      ? Omit<YouTubeMusic.Connection, 'service'> & { service: Pick<YouTubeMusic.Connection['service'], 'userId'> }
      : never

export class Connections {
    static getConnection = (id: string): DBConnectionData<serviceType> => {
        const { userId, type, service, tokens } = db.prepare(`SELECT * FROM Connections WHERE id = ?`).get(id) as ConnectionsTableSchema
        const parsedService = service ? JSON.parse(service) : undefined
        const parsedTokens = tokens ? JSON.parse(tokens) : undefined
        const connection: DBConnectionData<typeof type> = { id, userId, type, service: parsedService, tokens: parsedTokens }
        return connection
    }

    static getUserConnections = (userId: string): DBConnectionData<serviceType>[] => {
        const connectionRows = db.prepare(`SELECT * FROM Connections WHERE userId = ?`).all(userId) as ConnectionsTableSchema[]
        const connections: DBConnectionData<serviceType>[] = []
        for (const { id, type, service, tokens } of connectionRows) {
            const parsedService = service ? JSON.parse(service) : undefined
            const parsedTokens = tokens ? JSON.parse(tokens) : undefined
            connections.push({ id, userId, type, service: parsedService, tokens: parsedTokens })
        }
        return connections
    }

    static addConnection<T extends serviceType>(type: T, connectionData: Omit<DBConnectionData<T>, 'id' | 'type'>): string {
        const connectionId = generateUUID()
        const { userId, service, tokens } = connectionData
        db.prepare(`INSERT INTO Connections(id, userId, type, service, tokens) VALUES(?, ?, ?, ?, ?)`).run(connectionId, userId, type, JSON.stringify(service), JSON.stringify(tokens))
        return connectionId
    }

    static deleteConnection = (id: string): void => {
        const commandInfo = db.prepare(`DELETE FROM Connections WHERE id = ?`).run(id)
        if (commandInfo.changes === 0) throw new Error(`Connection with id: ${id} does not exist`)
    }

    static updateTokens = (id: string, accessToken?: string, refreshToken?: string, expiry?: number): void => {
        const newTokens = { accessToken, refreshToken, expiry }
        const commandInfo = db.prepare(`UPDATE Connections SET tokens = ? WHERE id = ?`).run(JSON.stringify(newTokens), id)
        if (commandInfo.changes === 0) throw new Error('Failed to update tokens')
    }

    static getExpiredConnections = (userId: string): DBConnectionData<serviceType>[] => {
        const expiredRows = db.prepare(`SELECT * FROM Connections WHERE userId = ? AND json_extract(tokens, '$.expiry') < ?`).all(userId, Date.now()) as ConnectionsTableSchema[]
        const connections: DBConnectionData<serviceType>[] = []
        for (const { id, userId, type, service, tokens } of expiredRows) {
            const parsedService = service ? JSON.parse(service) : undefined
            const parsedTokens = tokens ? JSON.parse(tokens) : undefined
            connections.push({ id, userId, type, service: parsedService, tokens: parsedTokens })
        }
        return connections
    }
}
