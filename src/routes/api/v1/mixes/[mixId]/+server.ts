import type { RequestHandler } from '@sveltejs/kit'
import { z } from 'zod'
import { DB } from '$lib/server/db'

// * Hook middleware garruntees mixId is valid.
// * Will intercept the call if the mixId does not exist

export const GET: RequestHandler = async ({ params }) => {
    const mix = (await DB.mixes.where('id', params.mixId!).first())!
    return Response.json(mix satisfies Mix)
}

const mixUpdate = z.object({
    name: z.string().optional(),
    thumbnailTag: z.string().optional(),
    description: z.string().optional(),
})

const updatedMixResponse = new Response('Updated mix.', { status: 200 })
const invalidDataResponse = new Response('Invalid Mix Data', { status: 400 })

export const PATCH: RequestHandler = async ({ params, request }) => {
    const updateMixData = await request
        .json()
        .then((data) => mixUpdate.parse(data))
        .catch(() => null)
    if (!updateMixData) return invalidDataResponse

    const mixId = params.mixId!
    const { name, thumbnailTag, description } = updateMixData

    await DB.mixes.where('id', mixId).update({ name, thumbnailTag, description })
    return updatedMixResponse
}

const deletedMixResponse = new Response('Deleted mix.', { status: 200 })

export const DELETE: RequestHandler = async ({ params }) => {
    await DB.mixes.where('id', params.mixId!).del()
    return deletedMixResponse
}
