import type { LayoutServerLoad } from './$types'

export const ssr = false

export const load: LayoutServerLoad = ({ url, locals }) => {
    const { pathname, search } = url
    return {
        url: {
            pathname,
            search,
        },
        user: locals.user,
    }
}
