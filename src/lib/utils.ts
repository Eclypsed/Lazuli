export const generateUUID = (): string => {
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c: any) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16))
}

export const isValidURL = (url: string): boolean => {
    try {
        return Boolean(new URL(url))
    } catch {
        return false
    }
}

export const getDeviceUUID = (): string => {
    const existingUUID = localStorage.getItem('deviceUUID')
    if (existingUUID) return existingUUID

    const newUUID = generateUUID()
    localStorage.setItem('deviceUUID', newUUID)
    return newUUID
}
