/** @type {import('./$types').RequestHandler} */
export async function GET({ url, fetch }) {
    const { serverUrl, username, password, deviceId } = Object.fromEntries(url.searchParams)
    if (!(serverUrl && username && password && deviceId)) return new Response('Missing authentication parameter', { status: 400 })

    let authResponse
    try {
        const authUrl = new URL('/Users/AuthenticateByName', serverUrl).href
        authResponse = await fetch(authUrl, {
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
    } catch {
        authResponse = new Response('Invalid server URL', { status: 400 })
    }

    if (!authResponse.ok) {
        authResponse = (await authResponse.text()) === 'Error processing request.' ? new Response('Invalid credentials', { status: 400 }) : authResponse
        return authResponse
    }

    if (!authResponse.headers.get('content-type').includes('application/json')) return new Response('Jellyfin server returned invalid data', { status: 500 })

    const data = await authResponse.json()
    const requiredData = ['User', 'SessionInfo', 'AccessToken', 'ServerId']

    if (!requiredData.every((key) => Object.keys(data).includes(key))) return new Response('Data missing from Jellyfin server response', { status: 500 })

    const responseData = JSON.stringify(data)
    const responseHeaders = new Headers({
        'Content-Type': 'application/json',
    })

    return new Response(responseData, { headers: responseHeaders })
}
