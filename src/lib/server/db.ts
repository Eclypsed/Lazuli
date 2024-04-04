import Database from 'better-sqlite3'
import type { Database as Sqlite3DB } from 'better-sqlite3'
import { generateUUID } from '$lib/utils'

interface DBConnectionsTableSchema {
    id: string
    userId: string
    type: string
    service?: string
    tokens?: string
}

type JellyfinDBConnection = {
    id: string
    userId: string
    type: 'jellyfin'
    service: {
        userId: string
        urlOrigin: string
    }
    tokens: {
        accessToken: string
    }
}

type YouTubeMusicDBConnection = {
    id: string
    userId: string
    type: 'youtube-music'
    service: {
        userId: string
    }
    tokens: {
        accessToken: string
        refreshToken: string
        expiry: number
    }
}

export type DBConnectionInfo = JellyfinDBConnection | YouTubeMusicDBConnection

class Storage {
    private readonly database: Sqlite3DB

    constructor(database: Sqlite3DB) {
        this.database = database
        this.database.pragma('foreign_keys = ON')
        this.database.exec(`CREATE TABLE IF NOT EXISTS Users(
            id VARCHAR(36) PRIMARY KEY,
            username VARCHAR(30) UNIQUE NOT NULL,
            passwordHash VARCHAR(72) NOT NULL
        )`)
        this.database.exec(`CREATE TABLE IF NOT EXISTS Connections(
            id VARCHAR(36) PRIMARY KEY,
            userId VARCHAR(36) NOT NULL,
            type VARCHAR(36) NOT NULL,
            service TEXT,
            tokens TEXT,
            FOREIGN KEY(userId) REFERENCES Users(id)
        )`)
        this.database.exec(`CREATE TABLE IF NOT EXISTS Playlists(
            id VARCHAR(36) PRIMARY KEY,
            userId VARCHAR(36) NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            items TEXT,
            FOREIGN KEY(userId) REFERENCES Users(id)
        )`)
    }

    public getUser = (id: string): User | undefined => {
        const user = this.database.prepare(`SELECT * FROM Users WHERE id = ?`).get(id) as User | undefined
        return user
    }

    public getUsername = (username: string): User | undefined => {
        const user = this.database.prepare(`SELECT * FROM Users WHERE lower(username) = ?`).get(username.toLowerCase()) as User | undefined
        return user
    }

    public addUser = (username: string, passwordHash: string): User => {
        const userId = generateUUID()
        this.database.prepare(`INSERT INTO Users(id, username, passwordHash) VALUES(?, ?, ?)`).run(userId, username, passwordHash)
        return this.getUser(userId)!
    }

    public deleteUser = (id: string): void => {
        const commandInfo = this.database.prepare(`DELETE FROM Users WHERE id = ?`).run(id)
        if (commandInfo.changes === 0) throw new Error(`User with id ${id} does not exist`)
    }

    public getConnectionInfo = (ids: string[]): DBConnectionInfo[] => {
        const connectionInfo: DBConnectionInfo[] = []
        for (const id of ids) {
            const result = this.database.prepare(`SELECT * FROM Connections WHERE id = ?`).get(id) as DBConnectionsTableSchema | undefined
            if (!result) continue

            const { userId, type, service, tokens } = result
            const parsedService = service ? JSON.parse(service) : undefined
            const parsedTokens = tokens ? JSON.parse(tokens) : undefined
            connectionInfo.push({ id, userId, type: type as DBConnectionInfo['type'], service: parsedService, tokens: parsedTokens })
        }
        return connectionInfo
    }

    public getUserConnectionInfo = (userId: string): DBConnectionInfo[] => {
        const connectionRows = this.database.prepare(`SELECT * FROM Connections WHERE userId = ?`).all(userId) as DBConnectionsTableSchema[]
        const connections: DBConnectionInfo[] = []
        for (const { id, type, service, tokens } of connectionRows) {
            const parsedService = service ? JSON.parse(service) : undefined
            const parsedTokens = tokens ? JSON.parse(tokens) : undefined
            connections.push({ id, userId, type: type as DBConnectionInfo['type'], service: parsedService, tokens: parsedTokens })
        }
        return connections
    }

    public addConnectionInfo = (connectionInfo: Omit<DBConnectionInfo, 'id'>): string => {
        const { userId, type, service, tokens } = connectionInfo
        const connectionId = generateUUID()
        this.database.prepare(`INSERT INTO Connections(id, userId, type, service, tokens) VALUES(?, ?, ?, ?, ?)`).run(connectionId, userId, type, JSON.stringify(service), JSON.stringify(tokens))
        return connectionId
    }

    public deleteConnectionInfo = (id: string): void => {
        const commandInfo = this.database.prepare(`DELETE FROM Connections WHERE id = ?`).run(id)
        if (commandInfo.changes === 0) throw new Error(`Connection with id: ${id} does not exist`)
    }

    public updateTokens = (id: string, tokens: DBConnectionInfo['tokens']): void => {
        const commandInfo = this.database.prepare(`UPDATE Connections SET tokens = ? WHERE id = ?`).run(JSON.stringify(tokens), id)
        if (commandInfo.changes === 0) throw new Error('Failed to update tokens')
    }
}

export const DB = new Storage(new Database('./src/lib/server/lazuli.db', { verbose: console.info }))
