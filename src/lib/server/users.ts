import Database from 'better-sqlite3'
import { generateUUID } from '$lib/utils'
import { isValidURL } from '$lib/utils'

const db = new Database('./src/lib/server/users.db', { verbose: console.info })
db.pragma('foreign_keys = ON')
const initUsersTable = 'CREATE TABLE IF NOT EXISTS Users(id VARCHAR(36) PRIMARY KEY, username VARCHAR(30) UNIQUE NOT NULL, password VARCHAR(72) NOT NULL)'
const initConnectionsTable = 'CREATE TABLE IF NOT EXISTS Connections(id VARCHAR(36) PRIMARY KEY, userId VARCHAR(36) NOT NULL, service TEXT NOT NULL, accessToken TEXT NOT NULL, FOREIGN KEY(userId) REFERENCES Users(id))'
db.exec(initUsersTable), db.exec(initConnectionsTable)

type UserQueryParams = {
    includePassword?: boolean
}

interface ConnectionsTableSchema {
    id: string
    userId: string
    service: string
    accessToken: string
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

export class Connections {
    static getConnection = (id: string): Connection => {
        const { userId, service, accessToken } = db.prepare('SELECT * FROM Connections WHERE id = ?').get(id) as ConnectionsTableSchema
        const connection: Connection = { id, user: Users.getUser(userId)!, service: JSON.parse(service), accessToken }
        return connection
    }

    static getUserConnections = (userId: string): Connection[] => {
        const connectionRows = db.prepare('SELECT * FROM Connections WHERE userId = ?').all(userId) as ConnectionsTableSchema[]
        const connections: Connection[] = []
        const user = Users.getUser(userId)!
        connectionRows.forEach((row) => {
            const { id, service, accessToken } = row
            connections.push({ id, user, service: JSON.parse(service), accessToken })
        })
        return connections
    }

    static addConnection = (userId: string, service: Service, accessToken: string): Connection => {
        const connectionId = generateUUID()
        if (!isValidURL(service.urlOrigin)) throw new Error('Service does not have valid url')
        db.prepare('INSERT INTO Connections(id, userId, service, accessToken) VALUES(?, ?, ?, ?)').run(connectionId, userId, JSON.stringify(service), accessToken)
        return this.getConnection(connectionId)
    }

    static deleteConnection = (id: string): void => {
        const commandInfo = db.prepare('DELETE FROM Connections WHERE id = ?').run(id)
        if (commandInfo.changes === 0) throw new Error(`Connection with id: ${id} does not exist`)
    }
}
