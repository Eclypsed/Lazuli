import { SECRET_JWT_KEY } from '$env/static/private'
import { fail, redirect } from '@sveltejs/kit'
import { genSaltSync, hashSync } from 'bcrypt-ts'
import type { PageServerLoad, Actions } from './$types'
import { Users } from '$lib/server/users'
import type { User } from '$lib/server/users'

export const load: PageServerLoad = async ({ url }) => {
    const redirectLocation = url.searchParams.get('redirect')
    return { redirectLocation }
}

export const actions: Actions = {
    signIn: async ({ request, cookies }) => {
        const formData = await request.formData()
        const { username, password, redirectLocation } = Object.fromEntries(formData)
    },
}
