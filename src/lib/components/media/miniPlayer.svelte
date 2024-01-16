<script>
    export let displayMode

    import IconButton from '$lib/components/utility/iconButton.svelte'
    import Slider from '$lib/components/utility/slider.svelte'
    import { currentlyPlaying } from '$lib/utils/stores.js'
    import { slide } from 'svelte/transition'
    import { getVolume, setVolume } from '$lib/utils/utils.js'
    import { onMount } from 'svelte'

    $: song = $currentlyPlaying

    let songLiked = false

    let volumeSlider

    let volume
    onMount(() => {
        volume = getVolume()
    })
    $: console.log(volume)

    const formatDuration = (timeMilliseconds) => {
        const seconds = Math.floor((timeMilliseconds / 1000) % 60)
        const minutes = Math.floor((timeMilliseconds / 1000 / 60) % 60)

        return [minutes.toString(), seconds.toString.padStart(2, '0')].join(':')
    }
</script>

{#if song}
    <div id="player-wrapper" class="relative border-t-2 border-t-lazuli-primary bg-neutral-950" transition:slide={{ axis: 'y' }}>
        {#if displayMode === 'vertical'}
            <h1>Vertical Mode</h1>
        {:else}
            <div class="grid h-full grid-cols-3 grid-rows-1 p-3 text-sm">
                <section class="flex items-center gap-4">
                    <img class="h-full rounded-lg object-contain" src={song.image} alt="{song.name} thumbnail" />
                    <div class="flex flex-col gap-1">
                        <div>{song.name}</div>
                        <div class="text-xs text-neutral-400">{Array.from(song.artists, (artist) => artist.name).join(', ')}</div>
                    </div>
                    <button class="grid aspect-square h-6 place-items-center text-lg transition-all" on:click={() => (songLiked = !songLiked)}>
                        {#if songLiked}
                            <i class="fa-solid fa-heart text-fuchsia-400" />
                        {:else}
                            <i class="fa-regular fa-heart text-neutral-400 hover:text-white" />
                        {/if}
                    </button>
                </section>
                <section class="flex items-center justify-center gap-4 py-1 text-xl">
                    <IconButton>
                        <i slot="icon" class="fa-solid fa-backward-step" />
                    </IconButton>
                    <IconButton>
                        <i slot="icon" class="fa-solid fa-play" />
                    </IconButton>
                    <IconButton on:click={() => ($currentlyPlaying = null)}>
                        <i slot="icon" class="fa-solid fa-stop" />
                    </IconButton>
                    <IconButton>
                        <i slot="icon" class="fa-solid fa-forward-step" />
                    </IconButton>
                </section>
                <section class="flex items-center justify-end gap-4 py-1 text-xl">
                    <div class="flex w-40 items-center gap-4">
                        <Slider
                            bind:this={volumeSlider}
                            initialValue={volume}
                            on:valuechange={(event) => {
                                volume = event.detail.value
                                setVolume(volume)
                            }}
                        />
                        <button
                            class="transition-colors hover:text-lazuli-primary"
                            on:click={() => {
                                if (volume > 0) {
                                    volume = 0
                                } else {
                                    volume = getVolume()
                                }
                                volumeSlider.setValue(volume)
                            }}
                        >
                            <i class="fa-solid fa-volume-high" />
                        </button>
                    </div>
                    <IconButton>
                        <i slot="icon" class="fa-solid fa-ellipsis-vertical" />
                    </IconButton>
                </section>
            </div>
        {/if}
    </div>
{/if}

<style>
    #player-wrapper {
        height: 72px;
    }
</style>
