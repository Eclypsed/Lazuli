import knex from 'knex'
import { SqliteError } from 'better-sqlite3'

const connectionTypes = ['jellyfin', 'youtube-music']

export declare namespace DBSchemas {
    interface Users {
        id: string
        username: string
        passwordHash: string
    }

    interface JellyfinConnection {
        id: string
        userId: string
        type: 'jellyfin'
        serviceUserId: string
        serverUrl: string
        accessToken: string
    }

    interface YouTubeMusicConnection {
        id: string
        userId: string
        type: 'youtube-music'
        serviceUserId: string
        accessToken: string
        refreshToken: string
        expiry: number
    }

    type Connections = JellyfinConnection | YouTubeMusicConnection

    interface Mixes {
        id: string
        userId: string
        name: string
        thumbnailTag?: string
        description?: string
        trackCount: number
        duration: number
    }

    interface MixItems {
        mixId: string
        connectionId: string
        connectionType: ConnectionType
        id: string
        index: number
    }

    interface Songs {
        connectionId: string
        connectionType: ConnectionType
        id: string
        name: string
        duration: number
        thumbnailUrl: string
        releaseDate?: string
        artists?: {
            id: string
            name: string
        }[]
        album?: {
            id: string
            name: string
        }
        uploader?: {
            id: string
            name: string
        }
        isVideo: boolean
    }
}

class Database {
    public readonly knex: knex.Knex

    constructor(knex: knex.Knex<'better-sqlite3'>) {
        this.knex = knex
    }

    public uuid() {
        return this.knex.fn.uuid()
    }

    public get users() {
        return this.knex<DBSchemas.Users>('Users')
    }

    public get connections() {
        return this.knex<DBSchemas.Connections>('Connections')
    }

    public get mixes() {
        return this.knex<DBSchemas.Mixes>('Mixes')
    }

    public get mixItems() {
        return this.knex<DBSchemas.MixItems>('MixItems')
    }

    public get songs() {
        return this.knex<DBSchemas.Songs>('Songs')
    }

    public get sqliteError() {
        return SqliteError
    }

    public static async createUsersTable(db: knex.Knex<'better-sqlite3'>) {
        const exists = await db.schema.hasTable('Users')
        if (exists) return

        await db.schema.createTable('Users', (tb) => {
            tb.uuid('id').primary(), tb.string('username').unique().notNullable().checkLength('<=', 30), tb.string('passwordHash').notNullable().checkLength('=', 60)
        })
    }

    public static async createConnectionsTable(db: knex.Knex<'better-sqlite3'>) {
        const exists = await db.schema.hasTable('Connections')
        if (exists) return

        await db.schema.createTable('Connections', (tb) => {
            tb.uuid('id').primary(),
                tb.uuid('userId').notNullable().references('id').inTable('Users'),
                tb.enum('type', connectionTypes).notNullable(),
                tb.string('serviceUserId'),
                tb.string('serverUrl'),
                tb.string('accessToken'),
                tb.string('refreshToken'),
                tb.integer('expiry')
        })
    }

    public static async createMixesTable(db: knex.Knex<'better-sqlite3'>) {
        const exists = await db.schema.hasTable('Mixes')
        if (exists) return

        await db.schema.createTable('Mixes', (tb) => {
            tb.uuid('id').primary(),
                tb.uuid('userId').notNullable().references('id').inTable('Users'),
                tb.string('name').notNullable(),
                tb.uuid('thumbnailTag'),
                tb.string('description'),
                tb.integer('trackCount').notNullable(),
                tb.integer('duration').notNullable()
        })
    }

    public static async createMixItemsTable(db: knex.Knex<'better-sqlite3'>) {
        const exists = await db.schema.hasTable('MixItems')
        if (exists) return

        await db.schema.createTable('MixItems', (tb) => {
            tb.uuid('mixId').notNullable().references('id').inTable('Mixes'),
                tb.uuid('connectionId').notNullable().references('id').inTable('Connections'),
                tb.enum('connectionType', connectionTypes).notNullable(),
                tb.string('id').notNullable()
            tb.integer('index').notNullable()
        })
    }

    public static async createSongsTable(db: knex.Knex<'better-sqlite3'>) {
        const exists = await db.schema.hasTable('Songs')
        if (exists) return

        await db.schema.createTable('Songs', (tb) => {
            tb.uuid('connectionId').notNullable().references('id').inTable('Connections'),
                tb.enum('connectionType', connectionTypes),
                tb.string('id').notNullable(),
                tb.string('name').notNullable(),
                tb.integer('duration').notNullable(),
                tb.string('thumbnailUrl').notNullable(),
                tb.datetime('releaseDate', { precision: 3 }),
                tb.json('artists'),
                tb.json('album'),
                tb.json('uploader'),
                tb.boolean('isVideo').notNullable()
        })
    }
}

const db = knex<'better-sqlite3'>({ client: 'better-sqlite3', connection: { filename: './src/lib/server/lazuli.db' }, useNullAsDefault: false })
await Promise.all([Database.createUsersTable(db), Database.createConnectionsTable(db), Database.createMixesTable(db), Database.createMixItemsTable(db), Database.createSongsTable(db)])

export const DB = new Database(db)
