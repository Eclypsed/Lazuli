<script>
    export let mediaData

    import Services from '$lib/services.json'
    import IconButton from '$lib/components/utility/iconButton.svelte'

    const iconClasses = {
        song: 'fa-solid fa-music',
        album: 'fa-solid fa-compact-disc',
        artist: 'fa-solid fa-user',
        playlist: 'fa-solid fa-forward-fast',
    }

    let card, cardGlare

    const rotateCard = (event) => {
        const cardRect = card.getBoundingClientRect()
        const x = (2 * (event.x - cardRect.left)) / cardRect.width - 1 // These are simplified calculations to find the x-y coords relative to the center of the card
        const y = (2 * (cardRect.top - event.y)) / cardRect.height + 1

        let angle = Math.atan(x / y) // You'd think it should be y / x but it's actually the inverse
        const distanceFromCorner = Math.sqrt((x - 1) ** 2 + (y - 1) ** 2) // This is a cool little trick, the -1 on the x an y coordinate is effective the same as saying "make the origin of the glare [1, 1]"

        cardGlare.style.backgroundImage = `linear-gradient(${angle}rad, transparent ${distanceFromCorner * 50 + 50}%, rgba(255, 255, 255, 0.1) ${distanceFromCorner * 50 + 60}%, transparent 100%)`
        card.style.transform = `rotateX(${y * 10}deg) rotateY(${x * 10}deg)`
    }

    // TEST IMAGES --> https://f4.bcbits.com/img/a2436961975_10.jpg | {mediaData.image} | https://i.ytimg.com/vi/yvFgNP9iqd4/maxresdefault.jpg
</script>

<a id="card-wrapper" on:mousedown|preventDefault on:mousemove={(event) => rotateCard(event)} on:mouseleave={() => (card.style.transform = null)} href="/details?id={mediaData.id}&service={mediaData.connectionId}">
    <div bind:this={card} id="card" class="relative h-60 transition-all duration-200 ease-out">
        {#if mediaData.image}
            <img id="card-image" class="h-full max-w-none rounded-lg transition-all" src={mediaData.image} alt="{mediaData.name} thumbnail" />
        {:else}
            <div id="card-image" class="grid aspect-square h-full place-items-center rounded-lg bg-lazuli-primary transition-all">
                <i class="fa-solid fa-compact-disc text-7xl" />
            </div>
        {/if}
        <div bind:this={cardGlare} id="card-glare" class="absolute top-0 grid h-full w-full place-items-center rounded-lg opacity-0 transition-opacity duration-200 ease-out">
            <span class="relative h-12">
                <IconButton on:click={() => console.log(`Play ${mediaData.name}`)}>
                    <i slot="icon" class="fa-solid fa-play text-xl" />
                </IconButton>
            </span>
        </div>
        <div id="card-label" class="absolute -bottom-3 w-full px-2.5 text-sm">
            <div class="overflow-hidden text-ellipsis whitespace-nowrap" title={mediaData.name}>{mediaData.name}</div>
            <div class="flex w-full items-center gap-1.5 overflow-hidden text-neutral-400">
                <span id="artist-list" class="overflow-hidden text-ellipsis" style="font-size: 0;">
                    <!-- the font size of zero is to remove the stupid little gaps between the spans -->
                    {#each mediaData.artists as artist}
                        {@const listIndex = mediaData.artists.indexOf(artist)}
                        <a class="text-sm hover:underline" href="/artist?id={artist.id}&service={mediaData.connectionId}">{artist.name}</a>
                        {#if listIndex === mediaData.artists.length - 2}
                            <span class="mx-0.5 text-sm">&</span>
                        {:else if listIndex < mediaData.artists.length - 2}
                            <span class="mr-0.5 text-sm">,</span>
                        {/if}
                    {/each}
                </span>
                {#if mediaData.mediaType}
                    <span>&bull;</span>
                    <i class="{iconClasses[mediaData.mediaType]} text-xs" style="color: var({Services[mediaData.serviceType].primaryColor});" />
                {/if}
            </div>
        </div>
    </div>
</a>

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
    #card:hover > #card-image {
        filter: brightness(50%);
    }
    #card:hover > #card-glare {
        opacity: 1;
    }
    #card-image {
        mask-image: linear-gradient(to bottom, black 50%, transparent 95%);
    }
</style>
