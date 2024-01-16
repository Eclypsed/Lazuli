import { writable } from 'svelte/store'

export const pageWidth = writable(null)

export const newestAlert = writable([null, null])

export const currentlyPlaying = writable(null)

export const backgroundImage = writable(null)
