import { writable, readable, readonly, type Writable, type Readable } from 'svelte/store'
import type { AlertType } from '$lib/components/util/alert.svelte'

export const pageWidth: Writable<number> = writable()

export const newestAlert: Writable<[AlertType, string]> = writable()

const youtubeMusicBackground: string = 'https://www.gstatic.com/youtube/media/ytm/images/sbg/wsbg@4000x2250.png' // Default Youtube music background
export const backgroundImage: Writable<string> = writable(youtubeMusicBackground)

class Queue {
    private currentPosition: number // -1 means there is no current position
    private songs: Song[]

    constructor() {
        this.currentPosition = -1
        this.songs = []
    }

    get current() {
        if (this.songs.length > 0) {
            if (this.currentPosition === -1) this.currentPosition = 0
            return this.songs[this.currentPosition]
        }
        return null
    }

    set current(newSong: Song | null) {
        if (newSong === null) {
            this.currentPosition = -1
        } else {
            const queuePosition = this.songs.findIndex((song) => song === newSong)
            if (queuePosition < 0) {
                this.songs = [newSong]
                this.currentPosition = 0
            } else {
                this.currentPosition = queuePosition
            }
        }
        writableQueue.set(this)
    }

    get list() {
        return this.songs
    }

    public next() {
        if (this.songs.length === 0 || !(this.songs.length > this.currentPosition + 1)) return

        this.currentPosition += 1
        writableQueue.set(this)
    }

    public previous() {
        if (this.songs.length === 0 || this.currentPosition <= 0) return

        this.currentPosition -= 1
        writableQueue.set(this)
    }

    public enqueue(...songs: Song[]) {
        this.songs.push(...songs)
        writableQueue.set(this)
    }

    public clear() {
        this.currentPosition = -1
        this.songs = []
        writableQueue.set(this)
    }
}

const writableQueue: Writable<Queue> = writable(new Queue())
export const queue: Readable<Queue> = readonly(writableQueue)
