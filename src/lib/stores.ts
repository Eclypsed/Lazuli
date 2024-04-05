import { writable, type Writable } from 'svelte/store'
import type { AlertType } from '$lib/components/util/alert.svelte'

export const pageWidth: Writable<number> = writable()

export const newestAlert: Writable<[AlertType, string]> = writable()

export const currentlyPlaying: Writable<Song | null> = writable()

const youtubeMusicBackground: string = 'https://www.gstatic.com/youtube/media/ytm/images/sbg/wsbg@4000x2250.png' // Default Youtube music background
export const backgroundImage: Writable<string> = writable(youtubeMusicBackground)
