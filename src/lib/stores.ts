import { writable, readable, readonly, type Writable, type Readable } from 'svelte/store'
import type { AlertType } from '$lib/components/util/alert.svelte'

export const pageWidth: Writable<number> = writable()

export const newestAlert: Writable<[AlertType, string]> = writable()

const youtubeMusicBackground: string = 'https://www.gstatic.com/youtube/media/ytm/images/sbg/wsbg@4000x2250.png' // Default Youtube music background
export const backgroundImage: Writable<string> = writable(youtubeMusicBackground)

function fisherYatesShuffle<T>(items: T[]) {
    for (let currentIndex = items.length - 1; currentIndex >= 0; currentIndex--) {
        let randomIndex = Math.floor(Math.random() * (currentIndex + 1))

        ;[items[currentIndex], items[randomIndex]] = [items[randomIndex], items[currentIndex]]
    }
    return items
}

// ? New idea for how to handle mixing. Keep originalSongs and currentSongs but also add playedSongs. Add the previous song to played songs whenever next() is called.
// ? Whenever a song is mixed, set currentSongs = [...playedSongs, currentSongs[currentPosition], ...fisherYatesShuffle(everything else)]. Reorder method would stay the same.
// ? IDK it's a thought

class Queue {
    private currentPosition: number // -1 means no song is playing
    private originalSongs: Song[]
    private currentSongs: Song[]

    private shuffled: boolean

    constructor() {
        this.currentPosition = -1
        this.originalSongs = []
        this.currentSongs = []

        this.shuffled = false
    }

    get current() {
        if (this.currentSongs.length === 0) return null

        if (this.currentPosition === -1) this.currentPosition = 0
        return this.currentSongs[this.currentPosition]
    }

    /** Sets the currently playing song to the song provided as long as it is in the current playlist */
    set current(newSong: Song | null) {
        if (newSong === null) {
            this.currentPosition = -1
        } else {
            const queuePosition = this.currentSongs.findIndex((song) => song === newSong)
            if (queuePosition >= 0) this.currentPosition = queuePosition
        }

        writableQueue.set(this)
    }

    get list() {
        return this.currentSongs
    }

    get isShuffled() {
        return this.shuffled
    }

    /** Shuffles all songs in the queue after the currently playing song */
    public shuffle() {
        const shuffledSongs = fisherYatesShuffle(this.currentSongs.slice(this.currentPosition + 1))
        this.currentSongs = this.currentSongs.slice(0, this.currentPosition + 1).concat(shuffledSongs)
        this.shuffled = true
        writableQueue.set(this)
    }

    /** Restores the queue to its original ordered state, while maintaining whatever song is currently playing */
    public reorder() {
        const originalPosition = this.originalSongs.findIndex((song) => song === this.currentSongs[this.currentPosition])
        this.currentSongs = [...this.originalSongs]
        this.currentPosition = originalPosition
        this.shuffled = false
        writableQueue.set(this)
    }

    /** Starts the next song */
    public next() {
        if (this.currentSongs.length === 0 || this.currentSongs.length <= this.currentPosition + 1) return

        this.currentPosition += 1
        writableQueue.set(this)
    }

    /** Plays the previous song */
    public previous() {
        if (this.currentSongs.length === 0 || this.currentPosition <= 0) return

        this.currentPosition -= 1
        writableQueue.set(this)
    }

    /** Add songs to the end of the queue */
    public enqueue(...songs: Song[]) {
        this.originalSongs.push(...songs)
        this.currentSongs.push(...songs)
        writableQueue.set(this)
    }

    /**
     * @param songs An ordered array of Songs
     * @param shuffled Whether or not to shuffle the queue before starting playback. False if not specified
     */
    public setQueue(params: { songs: Song[]; shuffled?: boolean }) {
        if (params.songs.length === 0) return // Should not set a queue with no songs, use clear()
        this.originalSongs = params.songs
        this.currentSongs = params.shuffled ? fisherYatesShuffle(params.songs) : params.songs
        this.currentPosition = 0
        this.shuffled = params.shuffled ?? false
        writableQueue.set(this)
    }

    /** Clears all items from the queue */
    public clear() {
        this.currentPosition = -1
        this.originalSongs = []
        this.currentSongs = []
        writableQueue.set(this)
    }
}

const writableQueue: Writable<Queue> = writable(new Queue())
export const queue: Readable<Queue> = readonly(writableQueue)
