export const trailingSlash = 'never'

/** @type {import('./$types').PageServerLoad} */
export const load = ({ url }) => {
    return {
        url: url.pathname,
    }
}
