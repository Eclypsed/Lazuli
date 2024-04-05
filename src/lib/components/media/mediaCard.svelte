<script lang="ts">
    export let mediaItem: Song | Album | Artist | Playlist

    import IconButton from '$lib/components/util/iconButton.svelte'
    import { goto } from '$app/navigation'
    import { currentlyPlaying } from '$lib/stores'

    let image: HTMLImageElement, captionText: HTMLDivElement

    const setCurrentlyPlaying = () => {
        if (mediaItem.type === 'song') {
            $currentlyPlaying = mediaItem
        }
    }
</script>

<div id="card-wrapper" class="flex-shrink-0">
    <button id="thumbnail" class="relative h-52 transition-all duration-200 ease-out" on:click={() => goto(`/details/${mediaItem.type}?id=${mediaItem.id}`)}>
        {#if mediaItem.thumbnail}
            <img bind:this={image} id="card-image" on:load={() => (captionText.style.width = `${image.width}px`)} class="h-full rounded transition-all" src={mediaItem.thumbnail} alt="{mediaItem.name} thumbnail" />
        {:else}
            <div id="card-image" class="grid aspect-square h-full place-items-center rounded-lg bg-lazuli-primary transition-all">
                <i class="fa-solid fa-compact-disc text-7xl" />
            </div>
        {/if}
        <span id="play-button" class="absolute left-1/2 top-1/2 h-12 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-200 ease-out">
            <IconButton halo={true} on:click={setCurrentlyPlaying}>
                <i slot="icon" class="fa-solid fa-play text-xl" />
            </IconButton>
        </span>
    </button>
    <div bind:this={captionText} class="w-56 p-1">
        <div class="mb-0.5 line-clamp-2 text-wrap text-sm" title={mediaItem.name}>{mediaItem.name}</div>
        <div class="leading-2 line-clamp-2 text-neutral-400" style="font-size: 0;">
            {#if 'artists' in mediaItem && mediaItem.artists}
                {#each mediaItem.artists as artist}
                    {@const listIndex = mediaItem.artists.indexOf(artist)}
                    <a class="text-sm hover:underline focus:underline" href="/details/artist?id={artist.id}&connection={mediaItem.connection}">{artist.name}</a>
                    {#if listIndex < mediaItem.artists.length - 1}
                        <span class="mr-0.5 text-sm">,</span>
                    {/if}
                {/each}
            {/if}
        </div>
    </div>
</div>

<style>
    #thumbnail:hover {
        scale: 1.05;
    }
    #thumbnail:hover #card-image {
        filter: brightness(50%);
    }
    #thumbnail:hover #play-button {
        opacity: 1;
    }
</style>
