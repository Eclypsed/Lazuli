/** @type {import('./$types').LayoutLoad} */
export const load = ({ url, locals }) => {
    return {
        url: url.pathname,
        userId: locals.userId,
        username: locals.username,
    }
}
