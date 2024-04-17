import { writable, readable, readonly, type Writable, type Readable } from 'svelte/store'
import type { AlertType } from '$lib/components/util/alert.svelte'

export const pageWidth: Writable<number> = writable()

export const newestAlert: Writable<[AlertType, string]> = writable()

const youtubeMusicBackground: string = 'https://www.gstatic.com/youtube/media/ytm/images/sbg/wsbg@4000x2250.png' // Default Youtube music background
export const backgroundImage: Writable<string> = writable(youtubeMusicBackground)

class Queue {
    private currentPos: number | null
    private songs: Song[]

    constructor() {
        this.currentPos = null
        this.songs = []
    }

    public enqueue = (...songs: Song[]) => {
        this.songs.push(...songs)
        writeableQueue.set(this)
    }

    public next = () => {
        if (this.songs.length === 0) return

        if (!this.currentPos) {
            this.currentPos = 0
        } else {
            if (!(this.songs.length > this.currentPos + 1)) return
            this.currentPos += 1
        }

        writeableQueue.set(this)
    }

    public current = () => {
        if (this.songs.length > 0) {
            if (!this.currentPos) this.currentPos = 0
            return this.songs[this.currentPos]
        }
        return null
    }

    public getSongs = () => {
        return this.songs
    }
}

const writeableQueue: Writable<Queue> = writable(new Queue())
export const queue: Readable<Queue> = readonly(writeableQueue)
