import type { LayoutServerLoad } from './$types'

export const ssr = false

export const load: LayoutServerLoad = ({ locals }) => {
    return {
        user: locals.user,
    }
}
