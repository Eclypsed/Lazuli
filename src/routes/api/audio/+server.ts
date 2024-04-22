import type { RequestHandler } from '@sveltejs/kit'
import { Connections } from '$lib/server/connections'

export const GET: RequestHandler = async ({ url, request }) => {
    const connectionId = url.searchParams.get('connection')
    const id = url.searchParams.get('id')
    if (!(connectionId && id)) return new Response('Missing query parameter', { status: 400 })

    const range = request.headers.get('range')
    const connection = Connections.getConnections([connectionId])[0]

    const fetchStream = async (): Promise<Response> => {
        const MAX_TRIES = 5
        let tries = 0
        while (tries < MAX_TRIES) {
            ++tries
            const stream = await connection.getAudioStream(id, range).catch((reason) => {
                console.error(`Audio stream fetch failed: ${reason}`)
                return null
            })
            if (!stream || !stream.ok) continue

            return stream
        }

        throw new Error(`Audio stream fetch to connection: ${connection.id} of id ${id} failed`)
    }

    return await fetchStream()
}
