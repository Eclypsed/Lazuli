<script lang="ts">
    import { onMount } from 'svelte'
    import { fade, slide } from 'svelte/transition'
    import { queue } from '$lib/stores'
    // import { FastAverageColor } from 'fast-average-color'
    import Slider from '$lib/components/util/slider.svelte'
    import Loader from '$lib/components/util/loader.svelte'
    import LazyImage from './lazyImage.svelte'
    import IconButton from '$lib/components/util/iconButton.svelte'
    import ScrollingText from '$lib/components/util/scrollingText.svelte'
    import ArtistList from './artistList.svelte'

    // NEW IDEA: Only have the miniplayer for controls and for the expanded view just make it one large Videoplayer.
    // That way we can target the player to be the size of YouTube's default player. Then move the Queue view to it's own
    // dedicated sidebar like in spotify.

    $: currentlyPlaying = $queue.current

    let expanded = false

    let paused = true,
        loop = false

    $: shuffled = $queue.isShuffled

    const maxVolume = 0.5
    let volume: number

    let waiting: boolean

    function formatTime(seconds: number) {
        seconds = Math.round(seconds)
        const hours = Math.floor(seconds / 3600)
        seconds = seconds - hours * 3600
        const minutes = Math.floor(seconds / 60)
        seconds = seconds - minutes * 60
        const durationString = `${minutes}:${seconds.toString().padStart(2, '0')}`
        return hours > 0 ? `${hours}:`.concat(durationString) : durationString
    }

    $: updateMediaSession(currentlyPlaying)
    function updateMediaSession(media: Song | null) {
        if (!('mediaSession' in navigator)) return

        if (!media) {
            navigator.mediaSession.metadata = null
            return
        }

        navigator.mediaSession.metadata = new MediaMetadata({
            title: media.name,
            artist: media.artists?.map((artist) => artist.name).join(', ') ?? media.uploader?.name,
            album: media.album?.name,
            artwork: [
                { src: `/api/remoteImage?url=${media.thumbnailUrl}&maxWidth=96`, sizes: '96x96' },
                { src: `/api/remoteImage?url=${media.thumbnailUrl}&maxWidth=128`, sizes: '128x128' },
                { src: `/api/remoteImage?url=${media.thumbnailUrl}&maxWidth=192`, sizes: '192x192' },
                { src: `/api/remoteImage?url=${media.thumbnailUrl}&maxWidth=256`, sizes: '256x256' },
                { src: `/api/remoteImage?url=${media.thumbnailUrl}&maxWidth=384`, sizes: '384x384' },
                { src: `/api/remoteImage?url=${media.thumbnailUrl}&maxWidth=512`, sizes: '512x512' },
            ],
        })
    }

    onMount(() => {
        const storedVolume = Number(localStorage.getItem('volume'))
        if (storedVolume >= 0 && storedVolume <= maxVolume) {
            volume = storedVolume
        } else {
            localStorage.setItem('volume', (maxVolume / 2).toString())
            volume = maxVolume / 2
        }

        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => (paused = false))
            navigator.mediaSession.setActionHandler('pause', () => (paused = true))
            navigator.mediaSession.setActionHandler('stop', () => $queue.clear())
            navigator.mediaSession.setActionHandler('nexttrack', () => $queue.next())
            navigator.mediaSession.setActionHandler('previoustrack', () => $queue.previous())
        }
    })

    let currentTime: number = 0
    let duration: number = 0

    let currentTimeTimestamp: HTMLSpanElement
    let progressBar: Slider
    let durationTimestamp: HTMLSpanElement

    let expandedCurrentTimeTimestamp: HTMLSpanElement
    let expandedProgressBar: Slider
    let expandedDurationTimestamp: HTMLSpanElement

    let seeking: boolean = false
    $: if (!seeking && currentTimeTimestamp) currentTimeTimestamp.innerText = formatTime(currentTime)
    $: if (!seeking && progressBar) progressBar.$set({ value: currentTime })
    $: if (!seeking && durationTimestamp) durationTimestamp.innerText = formatTime(duration)
    $: if (!seeking && expandedCurrentTimeTimestamp) expandedCurrentTimeTimestamp.innerText = formatTime(currentTime)
    $: if (!seeking && expandedProgressBar) expandedProgressBar.$set({ value: currentTime })
    $: if (!seeking && expandedDurationTimestamp) expandedDurationTimestamp.innerText = formatTime(duration)

    let audioElement: HTMLAudioElement
</script>

{#if currentlyPlaying}
    <div id="player-wrapper" transition:slide class="{expanded ? 'h-full w-full' : 'm-4 h-20 w-[calc(100%_-_32px)] rounded-xl'} absolute bottom-0 z-40 overflow-clip bg-neutral-925 transition-all duration-500">
        {#if !expanded}
            <main in:fade={{ duration: 75, delay: 500 }} out:fade={{ duration: 75 }} class="flex h-20 w-full gap-10 pr-8">
                <section class="flex w-80 gap-3">
                    <div class="relative h-full w-20 min-w-20 overflow-clip rounded-xl">
                        <LazyImage thumbnailUrl={currentlyPlaying.thumbnailUrl} alt={`${currentlyPlaying.name} jacket`} objectFit={'cover'} />
                    </div>
                    <section class="flex flex-grow flex-col justify-center gap-1">
                        <div class="h-6">
                            <ScrollingText>
                                <div slot="text" class="line-clamp-1 font-medium">{currentlyPlaying.name}</div>
                            </ScrollingText>
                        </div>
                        <div class="line-clamp-1 text-xs font-extralight">
                            <ArtistList mediaItem={currentlyPlaying} />
                        </div>
                    </section>
                </section>
                <section class="flex flex-grow items-center gap-1 py-4">
                    <IconButton on:click={() => $queue.previous()}>
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
                    <IconButton on:click={() => $queue.clear()}>
                        <i slot="icon" class="fa-solid fa-stop text-xl" />
                    </IconButton>
                    <IconButton on:click={() => $queue.next()}>
                        <i slot="icon" class="fa-solid fa-forward-step text-xl" />
                    </IconButton>
                    <div class="flex flex-grow items-center justify-items-center gap-3 font-light">
                        <span bind:this={currentTimeTimestamp} class="w-16 text-right" />
                        <Slider
                            bind:this={progressBar}
                            max={duration}
                            on:seeking={(event) => {
                                currentTimeTimestamp.innerText = formatTime(event.detail.value)
                                seeking = true
                            }}
                            on:seeked={(event) => {
                                currentTime = event.detail.value
                                seeking = false
                            }}
                        />
                        <span bind:this={durationTimestamp} class="w-16 text-left" />
                    </div>
                </section>
                <section class="flex items-center justify-end gap-2.5 py-6 text-lg">
                    <div id="volume-slider" class="mx-4 flex h-10 w-44 items-center gap-3">
                        <IconButton on:click={() => (volume = volume > 0 ? 0 : Number(localStorage.getItem('volume')))}>
                            <i slot="icon" class="fa-solid {volume > maxVolume / 2 ? 'fa-volume-high' : volume > 0 ? 'fa-volume-low' : 'fa-volume-xmark'}" />
                        </IconButton>
                        <Slider
                            bind:value={volume}
                            max={maxVolume}
                            on:seeked={() => {
                                if (volume > 0) localStorage.setItem('volume', volume.toString())
                            }}
                        />
                    </div>
                    <IconButton on:click={() => (shuffled ? $queue.reorder() : $queue.shuffle())}>
                        <i slot="icon" class="fa-solid fa-shuffle {shuffled ? 'text-lazuli-primary' : 'text-white'}" />
                    </IconButton>
                    <IconButton on:click={() => (loop = !loop)}>
                        <i slot="icon" class="fa-solid fa-repeat {loop ? 'text-lazuli-primary' : 'text-white'}" />
                    </IconButton>
                    <IconButton on:click={() => (expanded = true)}>
                        <i slot="icon" class="fa-solid fa-chevron-up" />
                    </IconButton>
                </section>
            </main>
        {:else}
            <main id="expanded-player" in:fade={{ delay: 500 }} out:fade={{ duration: 75 }} class="relative h-full">
                <div class="absolute -z-10 h-full w-full blur-xl brightness-[25%]">
                    <LazyImage thumbnailUrl={currentlyPlaying.thumbnailUrl} alt={''} objectFit={'cover'} />
                </div>
                <section id="song-queue-wrapper" class="h-full px-24 py-20">
                    <section class="relative">
                        <LazyImage thumbnailUrl={currentlyPlaying.thumbnailUrl} alt={`${currentlyPlaying.name} jacket`} objectFit={'contain'} objectPosition={'left'} />
                    </section>
                    <section class="no-scrollbar flex max-h-full flex-col gap-3 overflow-y-scroll">
                        <strong class="ml-2 text-2xl">UP NEXT</strong>
                        {#each $queue.list as item}
                            {@const isCurrent = item === currentlyPlaying}
                            <button
                                on:click={() => {
                                    if (!isCurrent) $queue.setCurrent(item)
                                }}
                                class="queue-item h-20 w-full shrink-0 items-center gap-3 overflow-clip rounded-lg bg-neutral-900 {isCurrent
                                    ? 'pointer-events-none border-[1px] border-neutral-300'
                                    : 'hover:bg-neutral-800'}"
                            >
                                <div class="h-20 w-20">
                                    <LazyImage thumbnailUrl={item.thumbnailUrl} alt={`${item.name} jacket`} objectFit={'cover'} />
                                </div>
                                <div class="justify-items-left text-left">
                                    <div class="line-clamp-1">{item.name}</div>
                                    <div class="mt-[.15rem] line-clamp-1 text-neutral-400">{item.artists?.map((artist) => artist.name).join(', ') || item.uploader?.name}</div>
                                </div>
                                <span class="mr-4 text-right">{formatTime(item.duration)}</span>
                            </button>
                        {/each}
                    </section>
                </section>
                <section class="px-8">
                    <div id="progress-bar-expanded" class="mb-6">
                        <span bind:this={expandedCurrentTimeTimestamp} class="text-right" />
                        <Slider
                            bind:this={expandedProgressBar}
                            max={duration}
                            on:seeking={(event) => {
                                expandedCurrentTimeTimestamp.innerText = formatTime(event.detail.value)
                                seeking = true
                            }}
                            on:seeked={(event) => {
                                currentTime = event.detail.value
                                seeking = false
                            }}
                        />
                        <span bind:this={expandedDurationTimestamp} class="text-left" />
                    </div>
                    <div id="expanded-controls">
                        <div class="flex flex-col gap-1.5 overflow-hidden">
                            <div class="h-9">
                                <ScrollingText>
                                    <strong slot="text" class="text-3xl">{currentlyPlaying.name}</strong>
                                </ScrollingText>
                            </div>
                            {#if (currentlyPlaying.artists && currentlyPlaying.artists.length > 0) || currentlyPlaying.uploader}
                                <div class="line-clamp-1 flex flex-nowrap items-center font-extralight">
                                    <i class="fa-solid fa-user mr-3 text-sm" />
                                    <ArtistList mediaItem={currentlyPlaying} />
                                </div>
                            {/if}
                            {#if currentlyPlaying.album}
                                <div class="flex flex-nowrap items-center font-extralight">
                                    <i class="fa-solid fa-compact-disc mr-3 text-sm" />
                                    <a
                                        on:click={() => (expanded = false)}
                                        class="line-clamp-1 flex-shrink-0 hover:underline focus:underline"
                                        href="/details/album?id={currentlyPlaying.album.id}&connection={currentlyPlaying.connection.id}">{currentlyPlaying.album.name}</a
                                    >
                                </div>
                            {/if}
                        </div>
                        <div class="flex h-min w-full items-center justify-center gap-2 text-2xl">
                            <button on:click={() => (shuffled ? $queue.reorder() : $queue.shuffle())} class="aspect-square h-16">
                                <i class="fa-solid {shuffled ? 'fa-shuffle' : 'fa-right-left'}" />
                            </button>
                            <button class="aspect-square h-16" on:click={() => $queue.previous()}>
                                <i class="fa-solid fa-backward-step" />
                            </button>
                            <button on:click={() => (paused = !paused)} class="relative grid aspect-square h-16 place-items-center rounded-full bg-white text-black">
                                {#if waiting}
                                    <Loader size={2.5} />
                                {:else}
                                    <i class="fa-solid {paused ? 'fa-play' : 'fa-pause'}" />
                                {/if}
                            </button>
                            <button class="aspect-square h-16" on:click={() => $queue.next()}>
                                <i class="fa-solid fa-forward-step" />
                            </button>
                            <button on:click={() => (loop = !loop)} class="aspect-square h-16">
                                <i class="fa-solid fa-repeat {loop ? 'text-lazuli-primary' : 'text-white'}" />
                            </button>
                        </div>
                        <section class="flex h-min items-center justify-end gap-2 text-xl">
                            <div id="volume-slider" class="flex h-10 flex-row-reverse items-center gap-2">
                                <button on:click={() => (volume = volume > 0 ? 0 : Number(localStorage.getItem('volume')))} class="aspect-square h-8">
                                    <i class="fa-solid {volume > maxVolume / 2 ? 'fa-volume-high' : volume > 0 ? 'fa-volume-low' : 'fa-volume-xmark'} w-full text-center" />
                                </button>
                                <div id="slider-wrapper" class="w-24 transition-all duration-500">
                                    <Slider
                                        bind:value={volume}
                                        max={maxVolume}
                                        on:seeked={() => {
                                            if (volume > 0) localStorage.setItem('volume', volume.toString())
                                        }}
                                    />
                                </div>
                            </div>
                            <button class="aspect-square h-8" on:click={() => (expanded = false)}>
                                <i class="fa-solid fa-compress" />
                            </button>
                            <button class="aspect-square h-8" on:click={() => $queue.clear()}>
                                <i class="fa-solid fa-xmark" />
                            </button>
                        </section>
                    </div>
                </section>
            </main>
        {/if}
        <audio
            bind:this={audioElement}
            autoplay
            bind:paused
            bind:volume
            bind:currentTime
            bind:duration
            on:canplay={() => (waiting = false)}
            on:loadstart={() => (waiting = true)}
            on:waiting={() => (waiting = true)}
            on:ended={() => $queue.next()}
            on:error={() => setTimeout(() => audioElement.load(), 5000)}
            src="/api/audio?connection={currentlyPlaying.connection.id}&id={currentlyPlaying.id}"
            {loop}
        />
    </div>
{/if}

<style>
    #player-wrapper {
        filter: drop-shadow(0px 20px 20px #000000);
    }
    #expanded-player {
        display: grid;
        grid-template-rows: calc(100% - 11rem) 11rem;
    }
    #song-queue-wrapper {
        display: grid;
        grid-template-columns: 3fr 2fr;
        gap: 4rem;
    }
    .queue-item {
        display: grid;
        grid-template-columns: 5rem auto min-content;
    }
    #progress-bar-expanded {
        display: grid;
        grid-template-columns: min-content auto min-content;
        align-items: center;
        gap: 1rem;
    }
    #expanded-controls {
        display: grid;
        gap: 1rem;
        grid-template-columns: 1fr min-content 1fr !important;
    }
</style>
