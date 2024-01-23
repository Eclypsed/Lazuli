import Database from 'better-sqlite3'
import Services from '$lib/services.json'
import { generateUUID } from '$lib/utils'

const db = new Database('./src/lib/server/users.db', { verbose: console.info })
db.pragma('foreign_keys = ON')
const initUsersTable = 'CREATE TABLE IF NOT EXISTS Users(id VARCHAR(36) PRIMARY KEY, username VARCHAR(30) UNIQUE NOT NULL, password VARCHAR(72) NOT NULL)'
const initConnectionsTable =
    'CREATE TABLE IF NOT EXISTS Connections(id VARCHAR(36) PRIMARY KEY, userId VARCHAR(36) NOT NULL, serviceType VARCHAR(64) NOT NULL, serviceUser TEXT NOT NULL, serviceUrl TEXT NOT NULL, accessToken TEXT NOT NULL, refreshToken TEXT, expiry INTEGER, FOREIGN KEY(userId) REFERENCES Users(id))'
db.exec(initUsersTable)
db.exec(initConnectionsTable)

export interface User {
    id: string
    username: string
    password: string
}

export interface Service {
    url: string
    serviceType: 'jellyfin' | 'youtube-music'
    displayName: string
    icon: string
    primaryColor: string
}

export interface Connection {
    id: string
    user: User
    service: Service
    serviceUser: string
    accessToken: string
    refreshToken: string | null
    expiry: number | null
}

export class Users {
    static addUser = (username: string, hashedPassword: string): User => {
        const userId = generateUUID()
        db.prepare('INSERT INTO Users(id, username, password) VALUES(?, ?, ?)').run(userId, username, hashedPassword)
        return this.getUser(userId)
    }

    static getUser = (id: string): User => {
        return db.prepare('SELECT * FROM Users WHERE id = ?').get(id) as User
    }
}

export class Connections {
    // static getConnection = (id: string): Connection => {
    //     const connectionRow = db.prepare('SELECT * FROM Connections WHERE id = ?').get(id)
    // }
}
