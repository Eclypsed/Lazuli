import type { RequestHandler } from '@sveltejs/kit'
import { z } from 'zod'
import { DB } from '$lib/server/db'

export const GET: RequestHandler = async ({ params }) => {
    const mix = await DB.mixes.where('userId', params.userId!).select('*')
    return Response.json(mix satisfies Mix[])
}

const newMix = z.object({
    name: z.string(),
    thumbnailTag: z.string().optional(),
    description: z.string().optional(),
})

const invalidDataResponse = new Response('Invalid Mix Data', { status: 400 })

export const POST: RequestHandler = async ({ params, request }) => {
    const mixData = await request
        .json()
        .then((data) => newMix.parse(data))
        .catch(() => null)

    if (!mixData) return invalidDataResponse

    const userId = params.userId!
    const { name, thumbnailTag, description } = mixData
    const id = await DB.mixes.insert({ id: DB.uuid(), userId, name, thumbnailTag, description, trackCount: 0, duration: 0 }, 'id')
    return Response.json({ id }, { status: 201 })
}
