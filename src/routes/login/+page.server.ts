import { SECRET_JWT_KEY } from '$env/static/private'
import { fail, redirect } from '@sveltejs/kit'
import { compare, hash } from 'bcrypt-ts'
import type { PageServerLoad, Actions } from './$types'
import { Users } from '$lib/server/users'
import { sign } from 'jsonwebtoken'

export const load: PageServerLoad = async ({ url }) => {
    const redirectLocation = url.searchParams.get('redirect')
    return { redirectLocation }
}

export const actions: Actions = {
    signIn: async ({ request, cookies }) => {
        const formData = await request.formData()
        const { username, password, redirectLocation } = Object.fromEntries(formData)

        const user = Users.getUsername(username.toString(), { includePassword: true })
        if (!user) return fail(400, { message: 'Invalid Username' })

        const passwordValid = await compare(password.toString(), user.password!)
        if (!passwordValid) return fail(400, { message: 'Invalid Password' })

        const authToken = sign({ id: user.id, username: user.username }, SECRET_JWT_KEY, { expiresIn: '100d' })

        cookies.set('lazuli-auth', authToken, { path: '/', httpOnly: true, sameSite: 'strict', secure: false, maxAge: 60 * 60 * 24 * 100 })

        if (redirectLocation) throw redirect(303, redirectLocation.toString())
        throw redirect(303, '/')
    },

    newUser: async ({ request, cookies }) => {
        const formData = await request.formData()
        const { username, password } = Object.fromEntries(formData)

        const existingUsers = Users.allUsers()
        const existingUsernames = Array.from(existingUsers, (user) => user.username)
        if (username.toString() in existingUsernames) return fail(400, { message: 'Username already in use' })

        const passwordHash = await hash(password.toString(), 10)
        const newUser = Users.addUser(username.toString(), passwordHash)

        const authToken = sign({ id: newUser.id, username: newUser.username }, SECRET_JWT_KEY, { expiresIn: '100d' })

        cookies.set('lazuli-auth', authToken, { path: '/', httpOnly: true, sameSite: 'strict', secure: false, maxAge: 60 * 60 * 24 * 100 })

        throw redirect(303, '/')
    },
}
