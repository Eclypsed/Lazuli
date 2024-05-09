<script lang="ts">
    import { onMount } from 'svelte'
    import { fade, slide } from 'svelte/transition'
    import { queue } from '$lib/stores'
    // import { FastAverageColor } from 'fast-average-color'
    import Slider from '$lib/components/util/slider.svelte'

    $: currentlyPlaying = $queue.current

    let expanded = false

    let paused = true,
        shuffle = false,
        repeat = false

    let volume: number,
        muted = false

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
            localStorage.setItem('volume', '0.5')
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
                        <div class="text-xs">{currentlyPlaying.artists?.map((artist) => artist.name).join(', ') || currentlyPlaying.uploader?.name}</div>
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
                        <button on:click={() => (paused = !paused)} class="grid aspect-square h-8 place-items-center rounded-full bg-white">
                            <i class="fa-solid {paused ? 'fa-play' : 'fa-pause'} text-black" />
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
                            <i class="fa-solid {volume > 0.5 ? 'fa-volume-high' : volume > 0 ? 'fa-volume-low' : 'fa-volume-xmark'} w-full text-center" />
                        </button>
                        <div id="slider-wrapper" class="w-24 transition-all duration-500">
                            <Slider bind:value={volume} max={1} />
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
            <main in:fade={{ delay: 500 }} out:fade={{ duration: 75 }} class="expanded-player h-full" style="--currentlyPlayingImage: url(/api/remoteImage?url={currentlyPlaying.thumbnailUrl});">
                <section class="song-queue-wrapper h-full px-24 py-20">
                    <section class="relative">
                        {#key currentlyPlaying}
                            <img transition:fade={{ duration: 300 }} class="absolute h-full max-w-full object-contain py-8" src="/api/remoteImage?url={currentlyPlaying.thumbnailUrl}" alt="" />
                        {/key}
                    </section>
                    <section class="flex flex-col gap-2">
                        <div class="ml-2 text-2xl">Up next</div>
                        {#each $queue.list as item, index}
                            {@const isCurrent = item === currentlyPlaying}
                            <button
                                on:click={() => {
                                    if (!isCurrent) $queue.current = item
                                }}
                                class="queue-item w-full items-center gap-3 rounded-xl p-3 {isCurrent ? 'bg-[rgba(64,_64,_64,_0.5)]' : 'bg-[rgba(10,_10,_10,_0.5)]'}"
                            >
                                <div class="justify-self-center">{index + 1}</div>
                                <img class="justify-self-center" src="/api/remoteImage?url={item.thumbnailUrl}" alt="" draggable="false" />
                                <div class="justify-items-left text-left">
                                    <div class="line-clamp-2">{item.name}</div>
                                    <div class="mt-[.15rem] text-neutral-500">{currentlyPlaying.artists?.map((artist) => artist.name).join(', ') || currentlyPlaying.uploader?.name}</div>
                                </div>
                                <span class="text-right">{formatTime(item.duration)}</span>
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
                        <div>
                            <div class="mb-2 line-clamp-2 text-3xl">{currentlyPlaying.name}</div>
                            <div class="line-clamp-1 text-lg">
                                {currentlyPlaying.artists?.map((artist) => artist.name).join(', ') || currentlyPlaying.uploader?.name}{currentlyPlaying.album ? ` - ${currentlyPlaying.album.name}` : ''}
                            </div>
                        </div>
                        <div class="flex w-full items-center justify-center gap-2 text-2xl">
                            <button on:click={() => (shuffle = !shuffle)} class="aspect-square h-16">
                                <i class="fa-solid fa-shuffle" />
                            </button>
                            <button class="aspect-square h-16" on:click={() => $queue.previous()}>
                                <i class="fa-solid fa-backward-step" />
                            </button>
                            <button on:click={() => (paused = !paused)} class="grid aspect-square h-16 place-items-center rounded-full bg-white">
                                <i class="fa-solid {paused ? 'fa-play' : 'fa-pause'} text-black" />
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
                                    <i class="fa-solid {volume > 0.5 ? 'fa-volume-high' : volume > 0 ? 'fa-volume-low' : 'fa-volume-xmark'} w-full text-center" />
                                </button>
                                <div id="slider-wrapper" class="w-24 transition-all duration-500">
                                    <Slider bind:value={volume} max={1} />
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
        <audio autoplay bind:paused bind:volume bind:currentTime bind:duration on:ended={() => $queue.next()} src="/api/audio?connection={currentlyPlaying.connection.id}&id={currentlyPlaying.id}" />
    </div>
{/if}

<style>
    .expanded-player {
        display: grid;
        grid-template-rows: auto 12rem;
        /* background: linear-gradient(to left, rgba(16, 16, 16, 0.9), rgb(16, 16, 16)), var(--currentlyPlayingImage); */
        background-repeat: no-repeat !important;
        background-size: cover !important;
        background-position: center !important;
    }
    .song-queue-wrapper {
        display: grid;
        grid-template-columns: 3fr 2fr;
        gap: 4rem;
    }
    .queue-item {
        display: grid;
        grid-template-columns: 1rem 50px auto min-content;
    }
    .queue-item:hover {
        background-color: rgba(64, 64, 64, 0.5);
    }
    .progress-bar-expanded {
        display: grid;
        grid-template-columns: min-content auto min-content;
        align-items: center;
        gap: 1rem;
    }
    .expanded-controls {
        display: grid;
        grid-template-columns: 1fr min-content 1fr;
    }
</style>
