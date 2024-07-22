<script lang="ts">
    import ScrollingText from '$lib/components/util/scrollingText.svelte'
    import ArtistList from '$lib/components/media/artistList.svelte'
    import IconButton from '$lib/components/util/iconButton.svelte'
    import Slider from '$lib/components/util/slider.svelte'
    import Loader from '$lib/components/util/loader.svelte'
    import AutoImage from '$lib/components/media/autoImage.svelte'
    import PhQueueBold from '~icons/ph/queue-bold'
    import PhShuffleBold from '~icons/ph/shuffle-bold'
    import PhRepeatBold from '~icons/ph/repeat-bold'
    import BxVolumeFull from '~icons/bx/volume-full'
    import BxVolumeLow from '~icons/bx/volume-low'
    import BxVolume from '~icons/bx/volume'
    import MiExpand from '~icons/mi/expand'
    import { onMount, createEventDispatcher } from 'svelte'
    import { slide, fade } from 'svelte/transition'

    const dispatch = createEventDispatcher()

    export let mediaItem: Song,
        shuffled: boolean,
        mediaSession: MediaSession | null = null

    let loop = false,
        favorite = false

    const MAX_VOLUME = 0.5
    let volume: number, paused: boolean, waiting: boolean

    onMount(() => {
        volume = getStoredVolume()

        if (mediaSession) {
            mediaSession.setActionHandler('play', () => (paused = false))
            mediaSession.setActionHandler('pause', () => (paused = true))
            mediaSession.setActionHandler('stop', () => dispatch('stop'))
            mediaSession.setActionHandler('nexttrack', () => dispatch('next'))
            mediaSession.setActionHandler('previoustrack', () => dispatch('previous'))
        }
    })

    function getStoredVolume(): number {
        const storedVolume = Number.parseFloat(localStorage.getItem('volume') ?? '-1')
        if (storedVolume >= 0 && storedVolume <= MAX_VOLUME) return storedVolume

        const defaultVolume = MAX_VOLUME / 2
        localStorage.setItem('volume', defaultVolume.toString())
        return defaultVolume
    }

    $: if (mediaSession) updateMediaSession(mediaItem, mediaSession)
    function updateMediaSession(media: Song, mediaSession: MediaSession) {
        const mediaImage = (size: number): MediaImage => ({ src: `/api/remoteImage?url=${media.thumbnailUrl}&maxWidth=${size}`, sizes: `${size}x${size}` })

        const title = media.name
        const artist = media.artists?.map((artist) => artist.name).join(', ') ?? media.uploader?.name
        const album = media.album?.name
        const artwork: MediaImage[] = [mediaImage(96), mediaImage(128), mediaImage(192), mediaImage(256), mediaImage(384), mediaImage(512)]

        mediaSession.metadata = new MediaMetadata({ title, artist, album, artwork })
    }

    $: paused && mediaSession ? (mediaSession.playbackState = 'paused') : mediaSession ? (mediaSession.playbackState = 'playing') : null

    function formatTime(seconds: number) {
        seconds = Math.round(seconds)
        const hours = Math.floor(seconds / 3600)
        seconds -= hours * 3600
        const minutes = Math.floor(seconds / 60)
        seconds -= minutes * 60
        return hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}` : `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    let seeking = false,
        currentTime: number = 0,
        duration: number = 0

    let audioElement: HTMLAudioElement, currentTimestamp: string, durationTimestamp: string, progressBarValue: number, progressBar: Slider

    $: currentTimestamp = formatTime(seeking ? progressBarValue : currentTime)
    $: durationTimestamp = formatTime(duration)
    $: if (!seeking && progressBar) progressBar.$set({ value: currentTime })

    let playerWidth: number
</script>

<div bind:clientWidth={playerWidth} transition:slide id="player" class="flex h-20 items-center gap-4 overflow-clip bg-neutral-925 px-2.5 text-neutral-400">
    <div id="details" class="flex h-full items-center gap-3 overflow-clip py-2.5" style="backgrounds: linear-gradient(to right, red, blue); flex-grow: 1; flex-basis: 16rem">
        <div class="relative aspect-square h-full">
            <AutoImage thumbnailUrl={mediaItem.thumbnailUrl} alt="{mediaItem.name} jacket" loading="eager" --object-fit="cover" --height="100%" --border-radius="0.25rem" />
            <div id="jacket-play-button" class:hidden={playerWidth > 650} class="absolute bottom-0 left-0 right-0 top-0 backdrop-brightness-50">
                <IconButton on:click={() => (paused = !paused)}>
                    <i slot="icon" class="fa-solid {paused ? 'fa-play' : 'fa-pause'} text-2xl text-neutral-200" />
                </IconButton>
            </div>
        </div>
        <div class="flex flex-col justify-center gap-1">
            <ScrollingText>
                <span slot="text" title={mediaItem.name} class="line-clamp-1 text-sm font-medium text-neutral-200">{mediaItem.name}</span>
            </ScrollingText>
            <div class="line-clamp-1 text-xs">
                <ArtistList {mediaItem} />
            </div>
        </div>
        <div class="h-8">
            <IconButton --color="#ec4899" toggled={favorite} on:click={() => (favorite = !favorite)}>
                <i slot="icon" class={favorite ? 'fa-solid fa-heart' : 'fa-regular fa-heart'} />
            </IconButton>
        </div>
        <span class:hidden={playerWidth > 700 || playerWidth < 400} class="ml-auto whitespace-nowrap text-xs">{currentTimestamp} / {durationTimestamp}</span>
    </div>
    {#if playerWidth > 700}
        <!-- Change the flex-grow value to adjust the difference in rate of expansion between the details and controls -->
        <div id="controls" class="flex h-full items-center gap-1 py-4 pr-8 text-neutral-200" style="backgrounds: linear-gradient(to right, green, yellow); flex-grow: 10;">
            <IconButton on:click={() => dispatch('previous')}>
                <i slot="icon" class="fa-solid fa-backward-step text-xl" />
            </IconButton>
            <div class="relative aspect-square h-full rounded-full border border-neutral-700">
                {#if waiting}
                    <Loader size={1.5} />
                {:else}
                    <IconButton on:click={() => (paused = !paused)}>
                        <i slot="icon" class="fa-solid {paused ? 'fa-play' : 'fa-pause'}" />
                    </IconButton>
                {/if}
            </div>
            <IconButton on:click={() => dispatch('stop')}>
                <i slot="icon" class="fa-solid fa-stop text-xl" />
            </IconButton>
            <IconButton on:click={() => dispatch('next')}>
                <i slot="icon" class="fa-solid fa-forward-step text-xl" />
            </IconButton>
            {#if playerWidth > 800}
                <div class="flex flex-grow items-center justify-items-center gap-3 text-xs font-light">
                    <span>{currentTimestamp}</span>
                    <Slider
                        bind:this={progressBar}
                        bind:value={progressBarValue}
                        max={duration}
                        on:seeking={() => (seeking = true)}
                        on:seeked={() => {
                            currentTime = progressBarValue
                            seeking = false
                        }}
                    />
                    <span>{durationTimestamp}</span>
                </div>
            {:else}
                <span class="whitespace-nowrap text-xs font-light text-neutral-400">{currentTimestamp} / {durationTimestamp}</span>
            {/if}
        </div>
    {/if}
    {#if playerWidth > 450}
        <div id="tools" class="flex h-full justify-end gap-0.5 py-6" style="backgrounds: linear-gradient(to right, purple, orange);">
            {#if playerWidth > 1100}
                <IconButton --hover-color="#e5e5e5" toggled={shuffled} on:click={() => dispatch('toggleShuffle')}>
                    <PhShuffleBold slot="icon" />
                </IconButton>
                <IconButton --hover-color="#e5e5e5" toggled={loop} on:click={() => (loop = !loop)}>
                    <PhRepeatBold slot="icon" />
                </IconButton>
                <IconButton --hover-color="#e5e5e5">
                    <PhQueueBold slot="icon" />
                </IconButton>
                <div class="flex h-full items-center gap-1">
                    <IconButton --hover-color="#e5e5e5" on:click={() => (volume = volume > 0 ? 0 : getStoredVolume())}>
                        <span slot="icon" class="relative grid place-items-center">
                            {#if volume > MAX_VOLUME / 2}
                                <span class="absolute" in:fade={{ duration: 200 }} out:fade={{ duration: 200, delay: 100 }}><BxVolumeFull /></span>
                            {:else if volume > 0}
                                <span class="absolute" in:fade={{ duration: 200 }} out:fade={{ duration: 200, delay: 100 }}><BxVolumeLow /></span>
                            {:else}
                                <span class="absolute" in:fade={{ duration: 200 }} out:fade={{ duration: 200, delay: 100 }}><BxVolume /></span>
                            {/if}
                        </span>
                    </IconButton>
                    <div class="mr-2 w-20">
                        <Slider bind:value={volume} max={MAX_VOLUME} on:seeked={() => (volume > 0 ? localStorage.setItem('volume', volume.toString()) : null)} />
                    </div>
                </div>
                <IconButton --hover-color="#e5e5e5">
                    <MiExpand slot="icon" />
                </IconButton>
            {/if}
            <IconButton --hover-color="#e5e5e5">
                <i slot="icon" class="fa-solid fa-ellipsis-vertical" />
            </IconButton>
        </div>
    {/if}
    <audio
        {loop}
        autoplay
        src="/api/v1/audio?connection={mediaItem.connection.id}&id={mediaItem.id}"
        bind:paused
        bind:volume
        bind:duration
        bind:currentTime
        bind:this={audioElement}
        on:ended={() => dispatch('next')}
        on:waiting={() => (waiting = true)}
        on:canplay={() => (waiting = false)}
        on:loadstart={() => (waiting = true)}
        on:error={() => setTimeout(() => audioElement.load(), 5000)}
    />
</div>

<style>
    #player {
        border-radius: var(--border-radius);
        transition: border-radius 150ms linear;
        -webkit-box-shadow: 0px 0px 80px 0px rgba(0, 0, 0, 0.75);
        -moz-box-shadow: 0px 0px 80px 0px rgba(0, 0, 0, 0.75);
        box-shadow: 0px 0px 80px 0px rgba(0, 0, 0, 0.75);
    }
</style>
