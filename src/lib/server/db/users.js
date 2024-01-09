import Database from 'better-sqlite3'
import Services from '$lib/services.json'

const db = new Database('./src/lib/server/db/users.db', { verbose: console.info })
db.pragma('foreign_keys = ON')
const initUsersTable = 'CREATE TABLE IF NOT EXISTS Users(id INTEGER PRIMARY KEY AUTOINCREMENT, username VARCHAR(64) UNIQUE NOT NULL, password VARCHAR(72) NOT NULL)'
const initUserConnectionsTable =
    'CREATE TABLE IF NOT EXISTS UserConnections(id VARCHAR(36) PRIMARY KEY, userId INTEGER NOT NULL, serviceType VARCHAR(64) NOT NULL, serviceUserId TEXT NOT NULL, serviceUrl TEXT NOT NULL, accessToken TEXT NOT NULL, refreshToken TEXT, expiry INTEGER, FOREIGN KEY(userId) REFERENCES Users(id))'
db.exec(initUsersTable)
db.exec(initUserConnectionsTable)

export class Users {
    static addUser = (username, hashedPassword) => {
        try {
            db.prepare('INSERT INTO Users(username, password) VALUES(?, ?)').run(username, hashedPassword)
            return this.queryUsername(username)
        } catch {
            return null
        }
    }

    static queryUsername = (username) => {
        return db.prepare('SELECT * FROM Users WHERE lower(username) = ?').get(username.toLowerCase())
    }
}

export class UserConnections {
    static validServices = Object.keys(Services)

    static getConnection = (id) => {
        return db.prepare(`SELECT * FROM UserConnections WHERE id = ?`).get(id)
    }

    static getUserConnections = (userId) => {
        const connections = db.prepare(`SELECT * FROM UserConnections WHERE userId = ?`).all(userId)
        if (connections.length === 0) return null
        return connections
    }

    // May want to give accessToken a default of null in the future if one of the services does not use access tokens
    static addConnection = (userId, serviceType, serviceUserId, serviceUrl, accessToken, additionalApiData = {}) => {
        const { refreshToken = null, expiry = null } = additionalApiData

        if (!this.validServices.includes(serviceType)) throw new Error(`Service name ${serviceType} is invalid`)

        const connectionId = '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16))
        db.prepare('INSERT INTO UserConnections(id, userId, serviceType, serviceUserId, serviceUrl, accessToken, refreshToken, expiry) VALUES(?, ?, ?, ?, ?, ?, ?, ?)').run(
            connectionId,
            userId,
            serviceType,
            serviceUserId,
            serviceUrl,
            accessToken,
            refreshToken,
            expiry,
        )
        return connectionId
    }

    static deleteConnection = (userId, serviceId) => {
        const commandInfo = db.prepare('DELETE FROM UserConnections WHERE userId = ? AND id = ?').run(userId, serviceId)
        if (!commandInfo.changes === 0) throw new Error(`User does not have connection with id: ${serviceId}`)
    }
}
