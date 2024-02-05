<script lang="ts">
    export let mediaItem: MediaItem

    import Services from '$lib/services.json'
    import IconButton from '$lib/components/util/iconButton.svelte'
    import { goto } from '$app/navigation'

    const iconClasses = {
        song: 'fa-solid fa-music',
        album: 'fa-solid fa-compact-disc',
        artist: 'fa-solid fa-user',
        playlist: 'fa-solid fa-forward-fast',
    }

    let card: HTMLDivElement, cardGlare: HTMLDivElement

    const rotateCard = (event: MouseEvent): void => {
        const cardRect = card.getBoundingClientRect()
        const x = (2 * (event.x - cardRect.left)) / cardRect.width - 1 // These are simplified calculations to find the x-y coords relative to the center of the card
        const y = (2 * (cardRect.top - event.y)) / cardRect.height + 1

        const angle = Math.atan(x / y) // You'd think it should be y / x but it's actually the inverse
        const distanceFromCorner = Math.sqrt((x - 1) ** 2 + (y - 1) ** 2) // This is a cool little trick, the -1 on the x an y coordinate is effective the same as saying "make the origin of the glare [1, 1]"

        cardGlare.style.backgroundImage = `linear-gradient(${angle}rad, transparent ${distanceFromCorner * 50 + 50}%, rgba(255, 255, 255, 0.1) ${distanceFromCorner * 50 + 60}%, transparent 100%)`
        card.style.transform = `rotateX(${y * 10}deg) rotateY(${x * 10}deg)`
    }

    const checkSong = (item: MediaItem): item is Song => {
        return (item as Song).type === 'song'
    }
    const checkAlbum = (item: MediaItem): item is Album => {
        return (item as Album).type === 'album'
    }
</script>

<div id="card-wrapper" class="w-52 flex-shrink-0">
    <div bind:this={card} id="card" class="relative transition-all duration-200 ease-out grid place-items-center" on:mousemove={(event) => rotateCard(event)} on:mouseleave={() => (card.style.transform = '')} role="menuitem" tabindex="-1">
        <button on:click={() => goto(`/details/${mediaItem.type}?id=${mediaItem.id}&connection=${mediaItem.connectionId}`)}>
            {#if mediaItem.thumbnail}
                <img id="card-image" class="h-full rounded-lg transition-all" src={mediaItem.thumbnail} alt="{mediaItem.name} thumbnail" />
            {:else}
                <div id="card-image" class="grid aspect-square h-full place-items-center rounded-lg bg-lazuli-primary transition-all">
                    <i class="fa-solid fa-compact-disc text-7xl" />
                </div>
            {/if}
            <div bind:this={cardGlare} id="card-glare" class="absolute top-0 h-full w-full rounded-lg opacity-0 transition-opacity duration-200 ease-out" />
        </button>
        <span id="play-button" class="h-12 absolute opacity-0 transition-opacity duration-200 ease-out">
            <IconButton halo={true}>
                <i slot="icon" class="fa-solid fa-play text-xl" />
            </IconButton>
        </span>
    </div>
    <div class="p-2.5 text-sm">
        <div class="overflow-hidden text-ellipsis" title={mediaItem.name}>{mediaItem.name}</div>
        <div class="flex w-full items-center gap-1.5 overflow-hidden text-neutral-400">
            <span class="overflow-hidden text-ellipsis" style="font-size: 0; line-height: 0;">
                {#if checkSong(mediaItem) || checkAlbum(mediaItem)}
                    {#each mediaItem.artists as artist}
                        {@const listIndex = mediaItem.artists.indexOf(artist)}
                        <a class="text-sm hover:underline" href="/details/artist?id={artist.id}&connection={mediaItem.connectionId}">{artist.name}</a>
                        {#if listIndex === mediaItem.artists.length - 2}
                            <span class="mx-0.5 text-sm">&</span>
                        {:else if listIndex < mediaItem.artists.length - 2}
                            <span class="mr-0.5 text-sm">,</span>
                        {/if}
                    {/each}
                {/if}
            </span>
            {#if mediaItem.type}
                <span>&bull;</span>
                <i title="Stream from {Services[mediaItem.service.type].displayName}" class="{iconClasses[mediaItem.type]} text-xs" style="color: var({Services[mediaItem.service.type].primaryColor});" />
            {/if}
        </div>
    </div>
</div>

<style>
    #card-wrapper {
        perspective: 1000px;
    }
    #card-wrapper:focus-within #card-image {
        filter: brightness(50%);
    }
    #card-wrapper:focus-within #card-glare {
        opacity: 1;
    }
    #card:hover {
        scale: 1.05;
    }
    #card:hover #card-image {
        filter: brightness(50%);
    }
    #card:hover #card-glare {
        opacity: 1;
    }
    #card:hover #play-button {
        opacity: 1;
    }
</style>
