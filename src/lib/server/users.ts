import Database from 'better-sqlite3'
import { generateUUID } from '$lib/utils'

const db = new Database('./src/lib/server/users.db', { verbose: console.info })
db.pragma('foreign_keys = ON')
const initUsersTable = 'CREATE TABLE IF NOT EXISTS Users(id VARCHAR(36) PRIMARY KEY, username VARCHAR(30) UNIQUE NOT NULL, password VARCHAR(72) NOT NULL)'
const initServicesTable = 'CREATE TABLE IF NOT EXISTS Services(id VARCHAR(36) PRIMARY KEY, type VARCHAR(64) NOT NULL, serviceUserId TEXT NOT NULL, url TEXT NOT NULL)'
const initConnectionsTable =
    'CREATE TABLE IF NOT EXISTS Connections(id VARCHAR(36) PRIMARY KEY, userId VARCHAR(36) NOT NULL, serviceId VARCHAR(36), accessToken TEXT NOT NULL, refreshToken TEXT, expiry INTEGER, FOREIGN KEY(userId) REFERENCES Users(id), FOREIGN KEY(serviceId) REFERENCES Services(id))'
db.exec(initUsersTable)
db.exec(initServicesTable)
db.exec(initConnectionsTable)

type UserQueryParams = {
    includePassword?: boolean
}

export interface DBServiceData {
    id: string
    type: ServiceType
    serviceUserId: string
    url: string
}

interface DBServiceRow {
    id: string
    type: string
    serviceUserId: string
    url: string
}

export interface DBConnectionData {
    id: string
    user: User
    service: DBServiceData
    accessToken: string
    refreshToken: string | null
    expiry: number | null
}

interface DBConnectionRow {
    id: string
    userId: string
    serviceId: string
    accessToken: string
    refreshToken: string | null
    expiry: number | null
}

export class Users {
    static getUser = (id: string, params: UserQueryParams | null = null): User | undefined => {
        const user = db.prepare('SELECT * FROM Users WHERE id = ?').get(id) as User | undefined
        if (user && !params?.includePassword) delete user.password
        return user
    }

    static getUsername = (username: string, params: UserQueryParams | null = null): User | undefined => {
        const user = db.prepare('SELECT * FROM Users WHERE lower(username) = ?').get(username.toLowerCase()) as User | undefined
        if (user && !params?.includePassword) delete user.password
        return user
    }

    static allUsers = (includePassword: boolean = false): User[] => {
        const users = db.prepare('SELECT * FROM Users').all() as User[]
        if (!includePassword) users.forEach((user) => delete user.password)
        return users
    }

    static addUser = (username: string, hashedPassword: string): User => {
        const userId = generateUUID()
        db.prepare('INSERT INTO Users(id, username, password) VALUES(?, ?, ?)').run(userId, username, hashedPassword)
        return this.getUser(userId)!
    }

    static deleteUser = (id: string): void => {
        const commandInfo = db.prepare('DELETE FROM Users WHERE id = ?').run(id)
        if (commandInfo.changes === 0) throw new Error(`User with id ${id} does not exist`)
    }
}

export class Services {
    static getService = (id: string): DBServiceData => {
        const { type, serviceUserId, url } = db.prepare('SELECT * FROM Users WHERE id = ?').get(id) as DBServiceRow
        const service: DBServiceData = { id, type: type as ServiceType, serviceUserId, url }
        return service
    }

    static addService = (type: ServiceType, serviceUserId: string, url: URL): DBServiceData => {
        const serviceId = generateUUID()
        db.prepare('INSERT INTO Services(id, type, serviceUserId, url) VALUES(?, ?, ?, ?)').run(serviceId, type, serviceUserId, url.origin)
        return this.getService(serviceId)
    }

    static deleteService = (id: string): void => {
        const commandInfo = db.prepare('DELETE FROM Services WHERE id = ?').run(id)
        if (commandInfo.changes === 0) throw new Error(`Serivce with id ${id} does not exist`)
    }
}

export class Connections {
    static getConnection = (id: string): DBConnectionData => {
        const { userId, serviceId, accessToken, refreshToken, expiry } = db.prepare('SELECT * FROM Connections WHERE id = ?').get(id) as DBConnectionRow
        const connection: DBConnectionData = { id, user: Users.getUser(userId)!, service: Services.getService(serviceId), accessToken, refreshToken, expiry }
        return connection
    }

    static getUserConnections = (userId: string): DBConnectionData[] => {
        const connectionRows = db.prepare('SELECT * FROM Connections WHERE userId = ?').all(userId) as DBConnectionRow[]
        const connections: DBConnectionData[] = []
        const user = Users.getUser(userId)!
        connectionRows.forEach((row) => {
            const { id, serviceId, accessToken, refreshToken, expiry } = row
            connections.push({ id, user, service: Services.getService(serviceId), accessToken, refreshToken, expiry })
        })
        return connections
    }

    static addConnection = (userId: string, serviceId: string, accessToken: string, refreshToken: string | null, expiry: number | null): DBConnectionData => {
        const connectionId = generateUUID()
        db.prepare('INSERT INTO Connections(id, userId, serviceId, accessToken, refreshToken, expiry) VALUES(?, ?, ?, ?, ?, ?)').run(connectionId, userId, serviceId, accessToken, refreshToken, expiry)
        return this.getConnection(connectionId)
    }

    static deleteConnection = (id: string): void => {
        const commandInfo = db.prepare('DELETE FROM Connections WHERE id = ?').run(id)
        if (commandInfo.changes === 0) throw new Error(`Connection with id: ${id} does not exist`)
    }
}
