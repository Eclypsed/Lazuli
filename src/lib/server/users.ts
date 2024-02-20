import Database, { SqliteError } from 'better-sqlite3'
import { generateUUID } from '$lib/utils'
import { isValidURL } from '$lib/utils'

const db = new Database('./src/lib/server/users.db', { verbose: console.info })
db.pragma('foreign_keys = ON')
const initUsersTable = `CREATE TABLE IF NOT EXISTS Users(
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(30) UNIQUE NOT NULL,
    password VARCHAR(72) NOT NULL
)`
const initConnectionsTable = `CREATE TABLE IF NOT EXISTS Connections(
    id VARCHAR(36) PRIMARY KEY,
    userId VARCHAR(36) NOT NULL,
    service TEXT NOT NULL,
    accessToken TEXT NOT NULL,
    refreshToken TEXT,
    expiry NUMBER,
    FOREIGN KEY(userId) REFERENCES Users(id)
)`
db.exec(initUsersTable), db.exec(initConnectionsTable)

interface ConnectionsTableSchema {
    id: string
    userId: string
    service: string
    accessToken: string
    refreshToken?: string
    expiry?: number
}

export class Users {
    static getUser = (id: string): User | null => {
        const user = db.prepare('SELECT * FROM Users WHERE id = ?').get(id) as User | null
        return user
    }

    static getUsername = (username: string): User | null => {
        const user = db.prepare('SELECT * FROM Users WHERE lower(username) = ?').get(username.toLowerCase()) as User | null
        return user
    }

    static addUser = (username: string, hashedPassword: string): User | null => {
        if (this.getUsername(username)) return null

        const userId = generateUUID()
        db.prepare('INSERT INTO Users(id, username, password) VALUES(?, ?, ?)').run(userId, username, hashedPassword)
        return this.getUser(userId)!
    }

    static deleteUser = (id: string): void => {
        const commandInfo = db.prepare('DELETE FROM Users WHERE id = ?').run(id)
        if (commandInfo.changes === 0) throw new Error(`User with id ${id} does not exist`)
    }
}

export class Connections {
    static getConnection = (id: string): Connection => {
        const { userId, service, accessToken, refreshToken, expiry } = db.prepare('SELECT * FROM Connections WHERE id = ?').get(id) as ConnectionsTableSchema
        const connection: Connection = { id, userId, service: JSON.parse(service), accessToken, refreshToken, expiry }
        return connection
    }

    static getUserConnections = (userId: string): Connection[] => {
        const connectionRows = db.prepare('SELECT * FROM Connections WHERE userId = ?').all(userId) as ConnectionsTableSchema[]
        const connections: Connection[] = []
        for (const row of connectionRows) {
            const { id, service, accessToken, refreshToken, expiry } = row
            connections.push({ id, userId, service: JSON.parse(service), accessToken, refreshToken, expiry })
        }
        return connections
    }

    static addConnection = (userId: string, service: Service, accessToken: string, refreshToken?: string, expiry?: number): Connection => {
        const connectionId = generateUUID()
        const ytConnection: YouTubeMusic.Connection = {
            id: 'test',
            userId: 'test',
            youtubeUserId: 'test',
            type: 'youtube-music',
            accessToken: 'test',
        }
        const test = this.insertConnection(ytConnection)
        if (!isValidURL(service.urlOrigin)) throw new Error('Service does not have valid url')
        db.prepare('INSERT INTO Connections(id, userId, service, accessToken, refreshToken, expiry) VALUES(?, ?, ?, ?, ?, ?)').run(connectionId, userId, JSON.stringify(service), accessToken, refreshToken, expiry)
        return this.getConnection(connectionId)
    }

    static deleteConnection = (id: string): void => {
        const commandInfo = db.prepare('DELETE FROM Connections WHERE id = ?').run(id)
        if (commandInfo.changes === 0) throw new Error(`Connection with id: ${id} does not exist`)
    }

    static updateTokens = (id: string, accessToken: string, refreshToken?: string, expiry?: number): void => {
        const commandInfo = db.prepare('UPDATE Connections SET accessToken = ?, refreshToken = ?, expiry = ? WHERE id = ?').run(accessToken, refreshToken, expiry, id)
        if (commandInfo.changes === 0) throw new Error('Failed to update tokens')
    }

    static getExpiredConnections = (userId: string): Connection[] => {
        const expiredRows = db.prepare('SELECT * FROM Connections WHERE userId = ? AND expiry < ?').all(userId, Date.now()) as ConnectionsTableSchema[]
        const connections: Connection[] = []
        for (const row of expiredRows) {
            const { id, userId, service, accessToken, refreshToken, expiry } = row
            connections.push({ id, userId, service: JSON.parse(service), accessToken, refreshToken, expiry })
        }
        return connections
    }
}
