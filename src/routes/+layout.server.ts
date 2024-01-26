import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = ({ url, locals }) => {
    return { urlPathname: url.pathname, user: locals.user }
}
