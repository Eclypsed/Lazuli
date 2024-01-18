<script>
    export let displayMode

    import IconButton from '$lib/components/utility/iconButton.svelte'
    import VolumeSlider from '$lib/components/utility/volumeSlider.svelte'
    import Slider from '$lib/components/utility/slider.svelte'
    import { currentlyPlaying } from '$lib/utils/stores.js'
    import { slide } from 'svelte/transition'

    $: song = $currentlyPlaying

    let volume
    let songLiked = false,
        songPlaying = false

    const formatDuration = (timeMilliseconds) => {
        const seconds = Math.floor((timeMilliseconds / 1000) % 60)
        const minutes = Math.floor((timeMilliseconds / 1000 / 60) % 60)

        return [minutes.toString(), seconds.toString().padStart(2, '0')].join(':')
    }
</script>

{#if song}
    <div id="player-wrapper" class="relative w-full" transition:slide={{ axis: 'y' }}>
        {#if displayMode === 'vertical'}
            <h1>Vertical Mode</h1>
        {:else}
            <div class="grid h-full grid-cols-3 grid-rows-1 items-center gap-10 overflow-hidden bg-black px-6 text-lg">
                <section class="flex h-full w-full items-center justify-start gap-4 py-2.5 text-sm">
                    <img class="h-full rounded-lg object-contain" src={song.image} alt="{song.name} thumbnail" />
                    <div class="flex h-full flex-col justify-center gap-1 overflow-hidden">
                        <span class="overflow-hidden text-ellipsis" title={song.name}>{song.name}</span>
                        <span class="overflow-hidden text-ellipsis text-neutral-400" style="font-size: 0; line-height: 0;">
                            {#each song.artists as artist}
                                {@const listIndex = song.artists.indexOf(artist)}
                                <a class="text-xs hover:underline" href="/artist?id={artist.id}&service={song.connectionId}">{artist.name}</a>
                                {#if listIndex === song.artists.length - 2}
                                    <span class="mx-0.5 text-xs">&</span>
                                {:else if listIndex < song.artists.length - 2}
                                    <span class="mr-0.5 text-xs">,</span>
                                {/if}
                            {/each}
                        </span>
                    </div>
                    <button class="grid aspect-square h-6 place-items-center text-lg transition-all" on:click={() => (songLiked = !songLiked)}>
                        {#if songLiked}
                            <i class="fa-solid fa-heart text-fuchsia-400" />
                        {:else}
                            <i class="fa-regular fa-heart text-neutral-400 hover:text-white" />
                        {/if}
                    </button>
                </section>
                <section class="flex h-full w-full flex-col justify-center gap-1 justify-self-center">
                    <div class="flex h-6 items-center justify-center gap-4">
                        <IconButton halo={false}>
                            <i slot="icon" class="fa-solid fa-backward-step" />
                        </IconButton>
                        <IconButton halo={false} on:click={() => (songPlaying = !songPlaying)}>
                            <i slot="icon" class="fa-solid {songPlaying ? 'fa-pause' : 'fa-play'}" />
                        </IconButton>
                        <IconButton halo={false} on:click={() => ($currentlyPlaying = null)}>
                            <i slot="icon" class="fa-solid fa-stop" />
                        </IconButton>
                        <IconButton halo={false}>
                            <i slot="icon" class="fa-solid fa-forward-step" />
                        </IconButton>
                    </div>
                    <div class="flex items-center gap-2 text-sm text-neutral-400">
                        <div class="whitespace-nowrap">0:00</div>
                        <Slider />
                        <div class="whitespace-nowrap">{formatDuration(song.duration)}</div>
                    </div>
                </section>
                <section class="flex h-full items-center justify-end gap-1 py-5">
                    <VolumeSlider bind:volume />
                    <IconButton halo={false}>
                        <i slot="icon" class="fa-solid fa-shuffle" />
                    </IconButton>
                    <IconButton halo={false}>
                        <i slot="icon" class="fa-solid fa-repeat" />
                    </IconButton>
                    <IconButton halo={false}>
                        <i slot="icon" class="fa-solid fa-ellipsis-vertical" />
                    </IconButton>
                </section>
            </div>
        {/if}
    </div>
{/if}

<style>
    #player-wrapper {
        height: 80px;
    }
</style>
