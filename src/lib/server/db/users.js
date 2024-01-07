import Database from 'better-sqlite3'
import Services from '$lib/services.json'

const db = new Database('./src/lib/server/db/users.db', { verbose: console.info })
db.pragma('foreign_keys = ON')
const initUsersTable = 'CREATE TABLE IF NOT EXISTS Users(id INTEGER PRIMARY KEY AUTOINCREMENT, username VARCHAR(64) UNIQUE NOT NULL, password VARCHAR(72) NOT NULL)'
const initUserConnectionsTable =
    'CREATE TABLE IF NOT EXISTS UserConnections(id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER NOT NULL, serviceName VARCHAR(64) NOT NULL, accessToken TEXT, refreshToken TEXT, expiry DATETIME, FOREIGN KEY(userId) REFERENCES Users(id))'
const initJellyfinAuthTable = 'CREATE TABLE IF NOT EXISTS JellyfinConnections(id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT, accesstoken TEXT, serverid TEXT)'
const initYouTubeMusicConnectionsTable = ''
const initSpotifyConnectionsTable = ''
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

    static getConnections = (userId, serviceNames = null) => {
        if (!serviceNames) {
            const connections = db.prepare('SELECT * FROM UserConnections WHERE userId = ?').all(userId)
            if (connections.length === 0) return null
            return connections
        }

        if (!Array.isArray(serviceNames)) {
            if (typeof serviceNames !== 'string') throw new Error('Service names must be a string or array of strings')
            serviceNames = [serviceNames]
        }

        serviceNames = serviceNames.filter((service) => this.validServices.includes(service))

        const placeholders = serviceNames.map(() => '?').join(', ') // This is SQL-injection safe, the placeholders are just ?, ?, ?....
        const connections = db.prepare(`SELECT * FROM UserConnections WHERE userId = ? AND serviceName IN (${placeholders})`).all(userId, ...serviceNames)
        if (connections.length === 0) return null
        return connections
    }

    // May want to give accessToken a default of null in the future if one of the services does not use access tokens
    static setConnection = (userId, serviceName, accessToken, refreshToken = null, expiry = null) => {
        if (!this.validServices.includes(serviceName)) throw new Error(`Service name ${serviceName} is invalid`)

        const existingConnection = this.getConnections(userId, serviceName)
        if (existingConnection) {
            db.prepare('UPDATE UserConnections SET accessToken = ?, refreshToken = ?, expiry = ? WHERE userId = ? AND serviceName = ?').run(accessToken, refreshToken, expiry, userId, serviceName)
        } else {
            db.prepare('INSERT INTO UserConnections(userId, serviceName, accessToken, refreshToken, expiry) VALUES(?, ?, ?, ?, ?)').run(userId, serviceName, accessToken, refreshToken, expiry)
        }
        // return this.getConnections(userId, serviceName) <--- Uncomment this if want to return new connection data after update
    }

    static deleteConnection = (userId, serviceName) => {
        const info = db.prepare('DELETE FROM UserConnections WHERE userId = ? AND serviceName = ?').run(userId, serviceName)
        if (!info.changes === 0) throw new Error(`User does not have connection: ${serviceName}`)
    }
}
