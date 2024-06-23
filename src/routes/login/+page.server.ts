import { SECRET_JWT_KEY } from '$env/static/private'
import { fail, redirect } from '@sveltejs/kit'
import { compare, hash } from 'bcrypt-ts'
import type { PageServerLoad, Actions } from './$types'
import { DB } from '$lib/server/db'
import { SqliteError } from 'better-sqlite3'
import jwt from 'jsonwebtoken'

export const load: PageServerLoad = async ({ url }) => {
    const redirectLocation = url.searchParams.get('redirect')
    return { redirectLocation }
}

export const actions: Actions = {
    signIn: async ({ request, cookies }) => {
        const formData = await request.formData()
        const { username, password, redirectLocation } = Object.fromEntries(formData)

        const user = await DB.users.where('username', username.toString()).first()
        if (!user) return fail(400, { message: 'Invalid Username' })

        const passwordValid = await compare(password.toString(), user.passwordHash)
        if (!passwordValid) return fail(400, { message: 'Invalid Password' })

        const authToken = jwt.sign({ id: user.id, username: user.username }, SECRET_JWT_KEY, { expiresIn: '100d' })

        cookies.set('lazuli-auth', authToken, { path: '/', httpOnly: true, sameSite: 'strict', secure: false, maxAge: 60 * 60 * 24 * 100 })

        if (redirectLocation) throw redirect(303, redirectLocation.toString())
        throw redirect(303, '/')
    },

    newUser: async ({ request, cookies }) => {
        const formData = await request.formData()
        const { username, password } = Object.fromEntries(formData)

        const passwordHash = await hash(password.toString(), 10)
        const newUser = await DB.users
            .insert({ id: DB.uuid(), username: username.toString(), passwordHash }, '*')
            .then((data) => data[0])
            .catch((error: InstanceType<SqliteError>) => error)

        if (newUser instanceof SqliteError) {
            switch (newUser.code) {
                case 'SQLITE_CONSTRAINT_UNIQUE':
                    return fail(400, { message: 'Username already in use' })
                default:
                    console.log(newUser)
                    return fail(500, { message: 'Failed to create user. Reason Unknown' })
            }
        }

        const authToken = jwt.sign({ id: newUser.id, username: newUser.username }, SECRET_JWT_KEY, { expiresIn: '100d' })

        cookies.set('lazuli-auth', authToken, { path: '/', httpOnly: true, sameSite: 'strict', secure: false, maxAge: 60 * 60 * 24 * 100 })

        throw redirect(303, '/')
    },
}
