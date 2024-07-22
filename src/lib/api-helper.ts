import ky from 'ky'

export const apiV1 = ky.create({
    prefixUrl: '/api/v1/',
    credentials: 'include',
})
