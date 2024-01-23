import Database from 'better-sqlite3'
import Services from '$lib/services.json'
import { generateUUID } from '$lib/utils'

const db = new Database('./src/lib/server/users.db', { verbose: console.info })
db.pragma('foreign_keys = ON')
const initUsersTable = 'CREATE TABLE IF NOT EXISTS Users(id VARCHAR(36) PRIMARY KEY, username VARCHAR(30) UNIQUE NOT NULL, password VARCHAR(72) NOT NULL)'
db.exec(initUsersTable)

export interface User {
    id: string
    username: string
    password: string
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
