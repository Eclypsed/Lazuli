/** @type {import('./$types').LayoutLoad} */
export const load = ({ url }) => {
    return {
        url: url.pathname,
    }
}
