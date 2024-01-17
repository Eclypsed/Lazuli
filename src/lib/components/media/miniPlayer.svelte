<script>
    export let displayMode

    import IconButton from '$lib/components/utility/iconButton.svelte'
    import VolumeSlider from '$lib/components/utility/volumeSlider.svelte'
    import Slider from '$lib/components/utility/slider.svelte'
    import { currentlyPlaying } from '$lib/utils/stores.js'
    import { slide } from 'svelte/transition'

    $: song = $currentlyPlaying

    let songLiked = false

    const formatDuration = (timeMilliseconds) => {
        const seconds = Math.floor((timeMilliseconds / 1000) % 60)
        const minutes = Math.floor((timeMilliseconds / 1000 / 60) % 60)

        return [minutes.toString(), seconds.toString().padStart(2, '0')].join(':')
    }

    let volume
    $: console.log(volume)
</script>

{#if song}
    <div id="player-wrapper" class="relative flex w-full justify-center" transition:slide={{ axis: 'y' }}>
        {#if displayMode === 'vertical'}
            <h1>Vertical Mode</h1>
        {:else}
            <div class="grid h-full grid-cols-[1fr_auto_1fr] grid-rows-1 items-center gap-10 rounded-full bg-neutral-950 px-8 py-2.5 text-lg">
                <section class="flex h-full items-center justify-start gap-4 text-sm">
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
                <section class="flex h-full flex-col justify-center gap-1">
                    <div class="flex h-6 items-center justify-center gap-4">
                        <IconButton halo={false}>
                            <i slot="icon" class="fa-solid fa-backward-step" />
                        </IconButton>
                        <IconButton halo={false}>
                            <i slot="icon" class="fa-solid fa-play" />
                        </IconButton>
                        <IconButton halo={false} on:click={() => ($currentlyPlaying = null)}>
                            <i slot="icon" class="fa-solid fa-stop" />
                        </IconButton>
                        <IconButton halo={false}>
                            <i slot="icon" class="fa-solid fa-forward-step" />
                        </IconButton>
                    </div>
                    <div class="flex w-96 items-center gap-2 text-sm text-neutral-400">
                        <div class="whitespace-nowrap">0:00</div>
                        <Slider />
                        <div class="whitespace-nowrap">{formatDuration(song.duration)}</div>
                    </div>
                </section>
                <section class="flex h-full items-center justify-end gap-4 py-3">
                    <VolumeSlider bind:volume />
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
