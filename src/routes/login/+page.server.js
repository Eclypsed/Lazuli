import { SECRET_JWT_KEY } from '$env/static/private'
import { fail, redirect } from '@sveltejs/kit'
import { Users } from '$lib/server/db/users'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

/** @type {import('./$types').PageServerLoad} */
export const load = ({ url }) => {
    const redirectLocation = url.searchParams.get('redirect')
    return { redirectLocation: redirectLocation }
}

/** @type {import('./$types').Actions}} */
export const actions = {
    signIn: async ({ request, cookies }) => {
        const formData = await request.formData()
        const { username, password, redirectLocation } = Object.fromEntries(formData)

        const user = Users.queryUsername(username)
        if (!user) return fail(400, { message: 'Invalid Username' })

        const validPassword = await bcrypt.compare(password, user.password)
        if (!validPassword) return fail(400, { message: 'Invalid Password' })

        const authToken = jwt.sign(
            {
                id: user.id,
                user: user.username,
            },
            SECRET_JWT_KEY,
            { expiresIn: '100d' },
        )

        cookies.set('lazuli-auth', authToken, {
            path: '/',
            httpOnly: true,
            sameSite: 'strict',
            secure: false,
            maxAge: 60 * 60 * 24 * 100, // 100 Days
        })

        if (redirectLocation) throw redirect(303, redirectLocation)
        throw redirect(303, '/')
    },
    newUser: async ({ request, cookies }) => {
        const formData = await request.formData()
        const { username, password } = Object.fromEntries(formData)

        const passwordHash = await bcrypt.hash(password, 10)
        const newUser = Users.addUser(username, passwordHash)
        if (!newUser) return fail(400, { message: 'Username already exists' })

        const authToken = jwt.sign(
            {
                id: newUser.id,
                user: newUser.username,
            },
            SECRET_JWT_KEY,
            { expiresIn: '100d' },
        )

        cookies.set('lazuli-auth', authToken, {
            path: '/',
            httpOnly: true,
            sameSite: 'strict',
            secure: false,
            maxAge: 60 * 60 * 24 * 100, // 100 Days
        })
        throw redirect(303, '/')
    },
}
