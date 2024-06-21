import type { RequestHandler } from '@sveltejs/kit'
import { z } from 'zod'
import { DB } from '$lib/server/db'

const isPositiveInteger = (n: number) => !Number.isNaN(n) && Number.isSafeInteger(n) && n > 0

// export const GET: RequestHandler = async ({ params, url }) => {
//     const mixId = params.mixId!

//     const startIndexQuery = Number(url.searchParams.get('startIndex'))
//     const startIndex = isPositiveInteger(startIndexQuery) ? startIndexQuery : 0

//     const limitQuery = Number(url.searchParams.get('limit'))
//     const limit = isPositiveInteger(limitQuery) ? limitQuery : Number.POSITIVE_INFINITY

//     const playlistItemIds = await DB.mixItems
//         .select('*')
//         .where('id', mixId)
//         .whereBetween('index', [startIndex, startIndex + limit - 1])

//     return Response.json()
// }

// export const POST: RequestHandler = async ({ params }) => {}

// export const PATCH: RequestHandler = async ({ params }) => {}

// export const DELETE: RequestHandler = async ({ params }) => {}
