/** @type {import('./$types').PageServerLoad} */
export const load = ({ locals }) => {
    return {
        user: locals.user,
    }
}
