import { writable, readable, type Writable, type Readable } from 'svelte/store'
import type { AlertType } from '$lib/components/util/alert.svelte'

export const pageWidth: Writable<number> = writable()

export const newestAlert: Writable<[AlertType, string]> = writable()

const youtubeMusicBackground: string = 'https://www.gstatic.com/youtube/media/ytm/images/sbg/wsbg@4000x2250.png' // Default Youtube music background
export const backgroundImage: Writable<string> = writable(youtubeMusicBackground)

class Queue {
    public currentPos: number
    public queue: Song[]

    constructor() {
        this.queue = []
        this.currentPos = 0
    }

    public enqueue = (...songs: Song[]): void => {
        this.queue.push(...songs)
    }

    public getStart = (): Song | undefined => {
        return this.queue[0]
    }

    public getCurrent = (): Song => {
        return this.queue[this.currentPos]
    }

    public next = (): Song | undefined => {
        if (this.queue.length > this.currentPos + 1) {
            this.currentPos += 1
            return this.queue[this.currentPos]
        }

        return undefined
    }

    public previous = (): Song | undefined => {
        if (this.currentPos > 0) {
            this.currentPos -= 1
            return this.queue[this.currentPos]
        }

        return undefined
    }
}

export const queue: Readable<Queue> = readable(new Queue())
