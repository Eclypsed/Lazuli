import { writable } from 'svelte/store'
import type { Writable } from 'svelte/store'

export const pageWidth: Writable<number> = writable(0)

export const newestAlert: Writable<[AlertType, string] | null> = writable(null)

export const currentlyPlaying = writable(null)

const youtubeMusicBackground: string = 'https://www.gstatic.com/youtube/media/ytm/images/sbg/wsbg@4000x2250.png' // Default Youtube music background
export const backgroundImage: Writable<string> = writable(youtubeMusicBackground)
