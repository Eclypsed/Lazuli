import type { RequestHandler } from '@sveltejs/kit'
import { Jellyfin, YouTubeMusic } from '$lib/services'
import { Connections } from '$lib/server/users'

export const GET: RequestHandler = async ({ url }) => {
    const ids = url.searchParams.get('ids')?.replace(/\s/g, '').split(',')
    if (!ids) return new Response('Missing ids query parameter', { status: 400 })

    const connections: Connection<serviceType>[] = []
    for (const connectionId of ids) {
        const connection = Connections.getConnection(connectionId)
        switch (connection.type) {
            case 'jellyfin':
                connection.service = await Jellyfin.fetchSerivceInfo(connection.service.userId, connection.service.urlOrigin, connection.tokens.accessToken)
                break
            case 'youtube-music':
                connection.service = await YouTubeMusic.fetchServiceInfo(connection.service.userId, connection.tokens.accessToken)
                break
        }
    }

    return Response.json({ connections })
}
