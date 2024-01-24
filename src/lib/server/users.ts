import Database from 'better-sqlite3'
import { generateUUID } from '$lib/utils'

const db = new Database('./src/lib/server/users.db', { verbose: console.info })
db.pragma('foreign_keys = ON')
const initUsersTable = 'CREATE TABLE IF NOT EXISTS Users(id VARCHAR(36) PRIMARY KEY, username VARCHAR(30) UNIQUE NOT NULL, password VARCHAR(72) NOT NULL)'
const initServicesTable = 'CREATE TABLE IF NOT EXISTS Services(id VARCHAR(36) PRIMARY KEY, type VARCHAR(64) NOT NULL, userId TEXT NOT NULL, url TEXT NOT NULL)'
const initConnectionsTable =
    'CREATE TABLE IF NOT EXISTS Connections(id VARCHAR(36) PRIMARY KEY, userId VARCHAR(36) NOT NULL, serviceId VARCHAR(36), accessToken TEXT NOT NULL, refreshToken TEXT, expiry INTEGER, FOREIGN KEY(userId) REFERENCES Users(id), FOREIGN KEY(serviceId) REFERENCES Services(id))'
db.exec(initUsersTable)
db.exec(initServicesTable)
db.exec(initConnectionsTable)

export interface User {
    id: string
    username: string
    password: string
}

export type serviceType = 'jellyfin' | 'youtube-music'

export interface Service {
    id: string
    type: serviceType
    userId: string
    url: URL
}

interface DBServiceRow {
    id: string
    type: string
    userId: string
    url: string
}

export interface Connection {
    id: string
    user: User
    service: Service
    accessToken: string
    refreshToken: string | null
    expiry: number | null
}

interface DBConnectionRow {
    id: string
    userId: string
    serviceId: string
    accessToken: string
    refreshToken: string
    expiry: number
}

export class Users {
    static getUser = (id: string): User => {
        return db.prepare('SELECT * FROM Users WHERE id = ?').get(id) as User
    }

    static addUser = (username: string, hashedPassword: string): User => {
        const userId = generateUUID()
        db.prepare('INSERT INTO Users(id, username, password) VALUES(?, ?, ?)').run(userId, username, hashedPassword)
        return this.getUser(userId)
    }
}

export class Services {
    static getService = (id: string): Service => {
        const { type, userId, url } = db.prepare('SELECT * FROM Users WHERE id = ?').get(id) as DBServiceRow
        const service: Service = { id, type: type as serviceType, userId, url: new URL(url) }
        return service
    }

    static addService = (type: serviceType, userId: string, url: URL): Service => {
        const serviceId = generateUUID()
        db.prepare('INSERT INTO Services(id, type, userId, url) VALUES(?, ?, ?, ?)').run(serviceId, type, userId, url.origin)
        return this.getService(serviceId)
    }
}

export class Connections {
    static getConnection = (id: string): Connection => {
        const { userId, serviceId, accessToken, refreshToken, expiry } = db.prepare('SELECT * FROM Connections WHERE id = ?').get(id) as DBConnectionRow
        const connection: Connection = { id, user: Users.getUser(userId), service: Services.getService(serviceId), accessToken, refreshToken, expiry }
        return connection
    }

    static addConnection = (userId: string, serviceId: string, accessToken: string, refreshToken: string | null, expiry: number | null): Connection => {
        const connectionId = generateUUID()
        db.prepare('INSERT INTO Connections(id, userId, serviceId, accessToken, refreshToken, expiry) VALUES(?, ?, ?, ?, ?, ?)').run(connectionId, userId, serviceId, accessToken, refreshToken, expiry)
        return this.getConnection(connectionId)
    }
}
