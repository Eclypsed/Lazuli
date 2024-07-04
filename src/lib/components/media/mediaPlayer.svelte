<script lang="ts">
    import { onMount } from 'svelte'
    import { fade, slide, fly } from 'svelte/transition'
    import { queue } from '$lib/stores'
    import Services from '$lib/services.json'
    // import { FastAverageColor } from 'fast-average-color'
    import Slider from '$lib/components/util/slider.svelte'
    import Loader from '$lib/components/util/loader.svelte'
    import LazyImage from './lazyImage.svelte'
    import IconButton from '$lib/components/util/iconButton.svelte'
    import ScrollingText from '$lib/components/util/scrollingText.svelte'
    import ArtistList from './artistList.svelte'
    import ServiceLogo from '$lib/components/util/serviceLogo.svelte'

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
        return hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}` : `${minutes}:${seconds.toString().padStart(2, '0')}`
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
    <div
        id="player-wrapper"
        transition:slide
        class="{expanded ? 'h-full w-full' : 'm-3 h-20 w-[calc(100%_-_24px)] rounded-xl'} absolute bottom-0 z-40 overflow-clip bg-neutral-925 transition-all ease-in-out"
        style="transition-duration: 400ms;"
    >
        {#if !expanded}
            <main in:fade={{ duration: 75, delay: 500 }} out:fade={{ duration: 75 }} class="flex h-20 w-full gap-10">
                <section class="flex w-96 min-w-64 gap-3">
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
                    <div class="flex min-w-56 flex-grow items-center justify-items-center gap-3 font-light">
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
                <section class="flex items-center justify-end gap-2.5 py-6 pr-8 text-lg">
                    <div class="mx-4 flex h-10 w-40 items-center gap-3">
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
                <div class="absolute -z-10 h-full w-full blur-2xl brightness-[25%]">
                    <LazyImage thumbnailUrl={currentlyPlaying.thumbnailUrl} alt={''} objectFit={'cover'} />
                </div>
                <section class="relative grid h-full grid-rows-[1fr_4fr] gap-4 px-24 py-16">
                    <div class="grid grid-cols-[2fr_1fr]">
                        <div class="flex h-14 flex-row items-center gap-5">
                            <ServiceLogo type={currentlyPlaying.connection.type} />
                            <div>
                                <h1 class="text-neutral-400">STREAMING FROM</h1>
                                <strong class="text-2xl text-neutral-300">{Services[currentlyPlaying.connection.type].displayName}</strong>
                            </div>
                        </div>
                        <section>
                            {#if $queue.upNext}
                                {@const next = $queue.upNext}
                                <strong transition:fade class="ml-2 text-2xl">UP NEXT</strong>
                                <div transition:fly={{ x: 300 }} class="mt-3 flex h-20 w-full items-center gap-3 rounded-lg border border-neutral-300 bg-neutral-900 pr-3">
                                    <div class="aspect-square h-full">
                                        <LazyImage thumbnailUrl={next.thumbnailUrl} alt={`${next.name} jacket`} objectFit={'cover'} />
                                    </div>
                                    <div>
                                        <div class="mb-0.5 line-clamp-1 font-medium">{next.name}</div>
                                        <div class="line-clamp-1 text-sm font-light text-neutral-300">
                                            <ArtistList mediaItem={next} linked={false} />
                                        </div>
                                    </div>
                                </div>
                            {/if}
                        </section>
                    </div>
                    <LazyImage thumbnailUrl={currentlyPlaying.thumbnailUrl} alt={`${currentlyPlaying.name} jacket`} objectFit={'contain'} objectPosition={'left'} />
                </section>
                <section class="self-center px-16">
                    <div class="mb-7 flex min-w-56 flex-grow items-center justify-items-center gap-3 font-light">
                        <span bind:this={expandedCurrentTimeTimestamp} />
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
                        <span bind:this={expandedDurationTimestamp} />
                    </div>
                    <div id="expanded-controls">
                        <div class="flex min-w-56 flex-col gap-1.5 overflow-hidden">
                            <div class="h-10">
                                <ScrollingText>
                                    <strong slot="text" class="text-4xl">{currentlyPlaying.name}</strong>
                                </ScrollingText>
                            </div>
                            <div class="flex gap-3 text-lg font-medium text-neutral-300">
                                {#if (currentlyPlaying.artists && currentlyPlaying.artists.length > 0) || currentlyPlaying.uploader}
                                    <ArtistList mediaItem={currentlyPlaying} />
                                {/if}
                                {#if currentlyPlaying.album}
                                    <strong>&bullet;</strong>
                                    <a
                                        on:click={() => (expanded = false)}
                                        class="line-clamp-1 hover:underline focus:underline"
                                        href="/details/album?id={currentlyPlaying.album.id}&connection={currentlyPlaying.connection.id}">{currentlyPlaying.album.name}</a
                                    >
                                {/if}
                            </div>
                        </div>
                        <div class="flex h-16 w-full items-center justify-center gap-2 text-2xl">
                            <IconButton on:click={() => (shuffled ? $queue.reorder() : $queue.shuffle())}>
                                <i slot="icon" class="fa-solid fa-shuffle {shuffled ? 'text-lazuli-primary' : 'text-white'}" />
                            </IconButton>
                            <IconButton on:click={() => $queue.previous()}>
                                <i slot="icon" class="fa-solid fa-backward-step text-xl" />
                            </IconButton>
                            <div class="relative aspect-square h-full rounded-full bg-white text-black">
                                {#if waiting}
                                    <Loader size={1.5} />
                                {:else}
                                    <IconButton on:click={() => (paused = !paused)}>
                                        <i slot="icon" class="fa-solid {paused ? 'fa-play' : 'fa-pause'}" />
                                    </IconButton>
                                {/if}
                            </div>
                            <IconButton on:click={() => $queue.clear()}>
                                <i slot="icon" class="fa-solid fa-stop" />
                            </IconButton>
                            <IconButton on:click={() => $queue.next()}>
                                <i slot="icon" class="fa-solid fa-forward-step" />
                            </IconButton>
                            <IconButton on:click={() => (loop = !loop)}>
                                <i slot="icon" class="fa-solid fa-repeat {loop ? 'text-lazuli-primary' : 'text-white'}" />
                            </IconButton>
                        </div>
                        <section class="flex h-min items-center justify-end gap-2 text-xl">
                            <div class="mx-4 flex h-10 w-40 items-center gap-3">
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
                            <IconButton on:click={() => (expanded = false)}>
                                <i slot="icon" class="fa-solid fa-chevron-down" />
                            </IconButton>
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
            src="/api/v1/audio?connection={currentlyPlaying.connection.id}&id={currentlyPlaying.id}"
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
        grid-template-rows: 4fr 1fr;
    }
    #expanded-controls {
        display: grid;
        gap: 3rem;
        align-items: center;
        grid-template-columns: 1fr min-content 1fr !important;
    }
</style>
