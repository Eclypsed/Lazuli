<script lang="ts">
    import { onMount } from 'svelte'
    import { fade, slide } from 'svelte/transition'
    import { queue } from '$lib/stores'
    // import { FastAverageColor } from 'fast-average-color'
    import Slider from '$lib/components/util/slider.svelte'

    $: console.log(`Queue is now: ${$queue}`)

    let paused = true,
        shuffle = false,
        repeat = false

    let volume: number,
        muted = false

    $: if (volume) localStorage.setItem('volume', volume.toString())

    const formatTime = (seconds: number): string => {
        seconds = Math.floor(seconds)
        const hours = Math.floor(seconds / 3600)
        seconds = seconds - hours * 3600
        const minutes = Math.floor(seconds / 60)
        seconds = seconds - minutes * 60
        return hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}` : `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    onMount(() => {
        const storedVolume = localStorage.getItem('volume')
        if (storedVolume) {
            volume = Number(storedVolume)
        } else {
            localStorage.setItem('volume', '0.5')
            volume = 0.5
        }
    })

    let currentTime: number = 0
    let duration: number = 0

    let currentTimeTimestamp: HTMLSpanElement
    let progressBar: Slider
    let durationTimestamp: HTMLSpanElement

    let seeking: boolean = false
    $: if (!seeking && currentTimeTimestamp) currentTimeTimestamp.innerText = formatTime(currentTime)
    $: if (!seeking && progressBar) progressBar.$set({ value: currentTime })
    $: if (!seeking && durationTimestamp) durationTimestamp.innerText = formatTime(duration)
</script>

{#if $queue.queue.length > 0}
    {@const currentlyPlaying = $queue.getCurrent()}
    <main transition:slide class="relative m-4 grid h-20 grid-cols-[minmax(auto,_20rem)_auto_minmax(auto,_20rem)] gap-4 overflow-clip rounded-xl bg-neutral-925 text-white transition-colors duration-1000">
        <section class="flex gap-3">
            <div class="relative h-full w-20 min-w-20">
                {#key currentlyPlaying}
                    <div transition:fade={{ duration: 500 }} class="absolute h-full w-full bg-cover bg-center bg-no-repeat" style="background-image: url(/api/remoteImage?url={currentlyPlaying.thumbnail});" />
                {/key}
            </div>
            <section class="flex flex-col justify-center gap-1">
                <div class="line-clamp-2 text-sm">{currentlyPlaying.name}</div>
                <div class="text-xs">{currentlyPlaying.artists?.map((artist) => artist.name).join(', ') || currentlyPlaying.createdBy?.name}</div>
            </section>
        </section>
        <section class="flex min-w-max flex-col items-center justify-center gap-1">
            <div class="flex items-center gap-3 text-lg">
                <button on:click={() => (shuffle = !shuffle)} class="aspect-square h-8">
                    <i class="fa-solid fa-shuffle" />
                </button>
                <button class="aspect-square h-8">
                    <i class="fa-solid fa-backward-step" />
                </button>
                <button on:click={() => (paused = !paused)} class="grid aspect-square h-8 place-items-center rounded-full bg-white">
                    <i class="fa-solid {paused ? 'fa-play' : 'fa-pause'} text-black" />
                </button>
                <button class="aspect-square h-8">
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
        <section class="flex items-center justify-end pr-2 text-lg">
            <div id="volume-slider" class="flex h-10 w-fit flex-shrink-0 flex-row-reverse items-center gap-2">
                <button on:click={() => (muted = !muted)} class="aspect-square h-8">
                    <i class="fa-solid {volume > 0.5 ? 'fa-volume-high' : volume > 0 ? 'fa-volume-low' : 'fa-volume-xmark'} w-full text-center text-base" />
                </button>
                <div id="slider-wrapper" class="w-0 transition-all duration-500">
                    <Slider bind:value={volume} max={1} />
                </div>
            </div>
            <button class="aspect-square h-8" on:click={() => console.log('close')}>
                <i class="fa-solid fa-xmark" />
            </button>
        </section>
        <audio autoplay bind:paused bind:volume bind:currentTime bind:duration on:ended={() => console.log('next')} src="/api/audio?connection={currentlyPlaying.connection}&id={currentlyPlaying.id}" />
    </main>
{/if}

<style>
    #volume-slider:hover > #slider-wrapper {
        width: 6rem;
    }
    #slider-wrapper:focus-within {
        width: 6rem;
    }
</style>
