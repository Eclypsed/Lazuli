<script lang="ts">
    import { onMount } from 'svelte'
    import { fade, slide } from 'svelte/transition'
    import { queue } from '$lib/stores'
    // import { FastAverageColor } from 'fast-average-color'
    import Slider from '$lib/components/util/slider.svelte'
    import Loader from '$lib/components/util/loader.svelte'

    $: currentlyPlaying = $queue.current

    let expanded = false

    let paused = true,
        shuffle = false,
        repeat = false

    let volume: number,
        muted = false

    const maxVolume = 0.5

    let waiting: boolean

    $: muted ? (volume = 0) : (volume = Number(localStorage.getItem('volume')))
    $: if (volume && !muted) localStorage.setItem('volume', volume.toString())

    const formatTime = (seconds: number): string => {
        seconds = Math.floor(seconds)
        const hours = Math.floor(seconds / 3600)
        seconds = seconds - hours * 3600
        const minutes = Math.floor(seconds / 60)
        seconds = seconds - minutes * 60
        return hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}` : `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    $: if (currentlyPlaying) updateMediaSession(currentlyPlaying)
    const updateMediaSession = (media: Song) => {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: media.name,
                artist: media.artists?.map((artist) => artist.name).join(', ') || media.uploader?.name,
                album: media.album?.name,
                artwork: [{ src: `/api/remoteImage?url=${media.thumbnailUrl}`, sizes: '256x256', type: 'image/png' }],
            })
        }
    }

    onMount(() => {
        const storedVolume = localStorage.getItem('volume')
        if (storedVolume) {
            volume = Number(storedVolume)
        } else {
            localStorage.setItem('volume', (maxVolume / 2).toString())
            volume = 0.5
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

    let slidingText: HTMLElement
    let slidingTextWidth: number, slidingTextWrapperWidth: number
    let scrollDirection: 1 | -1 = 1
    $: scrollDistance = slidingTextWidth - slidingTextWrapperWidth
    $: if (slidingText && scrollDistance > 0) slidingText.style.animationDuration = `${scrollDistance / 50}s`

    let audioElement: HTMLAudioElement
</script>

{#if currentlyPlaying}
    <div transition:slide class="{expanded ? 'h-full w-full' : 'm-4 h-20 w-[calc(100%_-_32px)] rounded-xl'} absolute bottom-0 z-40 overflow-clip bg-neutral-925 transition-all duration-500">
        {#if !expanded}
            <main in:fade={{ duration: 75, delay: 500 }} out:fade={{ duration: 75 }} class="relative grid h-20 w-full grid-cols-[minmax(auto,_20rem)_auto_minmax(auto,_20rem)] gap-4">
                <section class="flex gap-3">
                    <div class="relative h-full w-20 min-w-20">
                        {#key currentlyPlaying}
                            <div transition:fade={{ duration: 500 }} class="absolute h-full w-full bg-cover bg-center bg-no-repeat" style="background-image: url(/api/remoteImage?url={currentlyPlaying.thumbnailUrl});" />
                        {/key}
                    </div>
                    <section class="flex flex-col justify-center gap-1">
                        <div class="line-clamp-2 text-sm">{currentlyPlaying.name}</div>
                        <div class="text-xs">{currentlyPlaying.artists?.map((artist) => artist.name).join(', ') ?? currentlyPlaying.uploader?.name}</div>
                    </section>
                </section>
                <section class="flex min-w-max flex-col items-center justify-center gap-1">
                    <div class="flex items-center gap-3 text-lg">
                        <button on:click={() => (shuffle = !shuffle)} class="aspect-square h-8">
                            <i class="fa-solid fa-shuffle" />
                        </button>
                        <button class="aspect-square h-8" on:click={() => $queue.previous()}>
                            <i class="fa-solid fa-backward-step" />
                        </button>
                        <button on:click={() => (paused = !paused)} class="relative grid aspect-square h-8 place-items-center rounded-full bg-white text-black">
                            {#if waiting}
                                <Loader size={1} />
                            {:else}
                                <i class="fa-solid {paused ? 'fa-play' : 'fa-pause'}" />
                            {/if}
                        </button>
                        <button class="aspect-square h-8" on:click={() => $queue.next()}>
                            <i class="fa-solid fa-forward-step" />
                        </button>
                        <button on:click={() => (repeat = !repeat)} class="aspect-square h-8">
                            <i class="fa-solid fa-repeat" />
                        </button>
                    </div>
                    <div class="flex items-center justify-items-center gap-2">
                        <span bind:this={currentTimeTimestamp} class="w-16 text-right" />
                        <div class="w-72">
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
                        </div>
                        <span bind:this={durationTimestamp} class="w-16 text-left" />
                    </div>
                </section>
                <section class="flex items-center justify-end gap-2 pr-2 text-lg">
                    <div id="volume-slider" class="flex h-10 flex-row-reverse items-center gap-2">
                        <button on:click={() => (muted = !muted)} class="aspect-square h-8">
                            <i class="fa-solid {volume > maxVolume / 2 ? 'fa-volume-high' : volume > 0 ? 'fa-volume-low' : 'fa-volume-xmark'} w-full text-center" />
                        </button>
                        <div id="slider-wrapper" class="w-24 transition-all duration-500">
                            <Slider bind:value={volume} max={maxVolume} />
                        </div>
                    </div>
                    <button class="aspect-square h-8" on:click={() => (expanded = true)}>
                        <i class="fa-solid fa-expand" />
                    </button>
                    <button class="aspect-square h-8" on:click={() => $queue.clear()}>
                        <i class="fa-solid fa-xmark" />
                    </button>
                </section>
            </main>
        {:else}
            <main in:fade={{ delay: 500 }} out:fade={{ duration: 75 }} class="expanded-player relative h-full" style="--currentlyPlayingImage: url(/api/remoteImage?url={currentlyPlaying.thumbnailUrl});">
                <img class="absolute -z-10 h-full w-full object-cover object-center blur-xl brightness-[25%]" src="/api/remoteImage?url={currentlyPlaying.thumbnailUrl}" alt="" />
                <section class="song-queue-wrapper h-full px-24 py-20">
                    <section class="relative">
                        {#key currentlyPlaying}
                            <img transition:fade={{ duration: 300 }} class="absolute h-full max-w-full object-contain py-8" src="/api/remoteImage?url={currentlyPlaying.thumbnailUrl}" alt="" />
                        {/key}
                    </section>
                    <section class="no-scrollbar flex max-h-full flex-col gap-3 overflow-y-scroll">
                        <strong class="ml-2 text-2xl">UP NEXT</strong>
                        {#each $queue.list as item}
                            {@const isCurrent = item === currentlyPlaying}
                            <button
                                on:click={() => {
                                    if (!isCurrent) $queue.current = item
                                }}
                                class="queue-item h-20 w-full shrink-0 items-center gap-3 overflow-clip rounded-lg bg-neutral-900 {isCurrent
                                    ? 'pointer-events-none border-[1px] border-neutral-300'
                                    : 'hover:bg-neutral-800'}"
                            >
                                <div class="h-20 w-20 bg-cover bg-center" style="background-image: url('/api/remoteImage?url={item.thumbnailUrl}');" />
                                <div class="justify-items-left text-left">
                                    <div class="line-clamp-1">{item.name}</div>
                                    <div class="mt-[.15rem] line-clamp-1 text-neutral-400">{item.artists?.map((artist) => artist.name).join(', ') ?? item.uploader?.name}</div>
                                </div>
                                <span class="mr-4 text-right">{formatTime(item.duration)}</span>
                            </button>
                        {/each}
                    </section>
                </section>
                <section class="px-8">
                    <div class="progress-bar-expanded mb-8">
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
                    <div class="expanded-controls">
                        <div class="flex flex-col gap-2 overflow-hidden">
                            <div bind:clientWidth={slidingTextWrapperWidth} class="relative h-9 w-full">
                                <strong
                                    bind:this={slidingText}
                                    bind:clientWidth={slidingTextWidth}
                                    on:animationend={() => (scrollDirection *= -1)}
                                    class="{scrollDistance > 0 ? (scrollDirection > 0 ? 'scrollLeft' : 'scrollRight') : ''} scrollingText absolute whitespace-nowrap text-3xl">{currentlyPlaying.name}</strong
                                >
                            </div>
                            <div class="line-clamp-1 flex flex-nowrap" style="font-size: 0;">
                                {#if 'artists' in currentlyPlaying && currentlyPlaying.artists && currentlyPlaying.artists.length > 0}
                                    {#each currentlyPlaying.artists as artist, index}
                                        <a
                                            on:click={() => (expanded = false)}
                                            class="line-clamp-1 flex-shrink-0 text-lg hover:underline focus:underline"
                                            href="/details/artist?id={artist.id}&connection={currentlyPlaying.connection.id}">{artist.name}</a
                                        >
                                        {#if index < currentlyPlaying.artists.length - 1}
                                            <span class="mr-1 text-lg">,</span>
                                        {/if}
                                    {/each}
                                {:else if 'uploader' in currentlyPlaying && currentlyPlaying.uploader}
                                    <a
                                        on:click={() => (expanded = false)}
                                        class="line-clamp-1 flex-shrink-0 text-lg hover:underline focus:underline"
                                        href="/details/user?id={currentlyPlaying.uploader.id}&connection={currentlyPlaying.connection.id}">{currentlyPlaying.uploader.name}</a
                                    >
                                {/if}
                                {#if currentlyPlaying.album}
                                    <span class="mx-1.5 text-lg">-</span>
                                    <a
                                        on:click={() => (expanded = false)}
                                        class="line-clamp-1 flex-shrink-0 text-lg hover:underline focus:underline"
                                        href="/details/album?id={currentlyPlaying.album.id}&connection={currentlyPlaying.connection.id}">{currentlyPlaying.album.name}</a
                                    >
                                {/if}
                            </div>
                        </div>
                        <div class="flex w-full items-center justify-center gap-2 text-2xl">
                            <button on:click={() => (shuffle = !shuffle)} class="aspect-square h-16">
                                <i class="fa-solid fa-shuffle" />
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
                            <button on:click={() => (repeat = !repeat)} class="aspect-square h-16">
                                <i class="fa-solid fa-repeat" />
                            </button>
                        </div>
                        <section class="flex items-center justify-end gap-2 text-xl">
                            <div id="volume-slider" class="flex h-10 flex-row-reverse items-center gap-2">
                                <button on:click={() => (muted = !muted)} class="aspect-square h-8">
                                    <i class="fa-solid {volume > maxVolume / 2 ? 'fa-volume-high' : volume > 0 ? 'fa-volume-low' : 'fa-volume-xmark'} w-full text-center" />
                                </button>
                                <div id="slider-wrapper" class="w-24 transition-all duration-500">
                                    <Slider bind:value={volume} max={maxVolume} />
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
        />
    </div>
{/if}

<style>
    .expanded-player {
        display: grid;
        grid-template-rows: calc(100% - 12rem) 12rem;
    }
    .song-queue-wrapper {
        display: grid;
        grid-template-columns: 3fr 2fr;
        gap: 4rem;
    }
    .queue-item {
        display: grid;
        grid-template-columns: 5rem auto min-content;
    }
    .progress-bar-expanded {
        display: grid;
        grid-template-columns: min-content auto min-content;
        align-items: center;
        gap: 1rem;
    }
    .expanded-controls {
        display: grid;
        gap: 1rem;
        grid-template-columns: 1fr min-content 1fr !important;
    }

    .scrollingText {
        animation-timing-function: linear;
        animation-fill-mode: both;
        animation-delay: 10s;
    }
    .scrollingText:hover {
        animation-play-state: paused;
    }
    .scrollLeft {
        animation-name: scrollLeft;
    }
    .scrollRight {
        animation-name: scrollRight;
    }

    @keyframes scrollLeft {
        0% {
            left: 0%;
            transform: translateX(0%);
        }
        100% {
            left: 100%;
            transform: translateX(-100%);
        }
    }

    @keyframes scrollRight {
        0% {
            left: 100%;
            transform: translateX(-100%);
        }
        100% {
            left: 0%;
            transform: translateX(0%);
        }
    }
</style>
