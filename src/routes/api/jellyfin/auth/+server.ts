import type { RequestHandler } from '@sveltejs/kit'
import { isValidURL } from '$lib/utils'
import { z } from 'zod'

export const POST: RequestHandler = async ({ request, fetch }) => {
    const jellyfinAuthSchema = z.object({
        serverUrl: z.string().refine((val) => isValidURL(val)),
        username: z.string(),
        password: z.string(),
        deviceId: z.string(),
    })

    const jellyfinAuthData = await request.json()
    const jellyfinAuthValidation = jellyfinAuthSchema.safeParse(jellyfinAuthData)
    if (!jellyfinAuthValidation.success) return new Response(jellyfinAuthValidation.error.message, { status: 400 })

    const { serverUrl, username, password, deviceId } = jellyfinAuthValidation.data
    const authUrl = new URL('/Users/AuthenticateByName', serverUrl).href
    const authResponse = await fetch(authUrl, {
        method: 'POST',
        body: JSON.stringify({
            Username: username,
            Pw: password,
        }),
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'X-Emby-Authorization': `MediaBrowser Client="Lazuli", Device="Chrome", DeviceId="${deviceId}", Version="1.0.0.0"`,
        },
    })

    if (!authResponse.ok) return new Response('Failed to authenticate', { status: 400 })

    const authData: Jellyfin.AuthData = await authResponse.json()
    return new Response(JSON.stringify(authData))
}
