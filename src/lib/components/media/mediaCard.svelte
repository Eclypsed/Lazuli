<script>
    export let mediaData
    import { onMount } from 'svelte'

    let card, cardGlare, cardWidth, cardHeight

    onMount(() => {
        const cardRect = card.getBoundingClientRect()
        cardWidth = cardRect.width
        cardHeight = cardRect.height
    })

    const rotateCard = (event) => {
        const cardRect = card.getBoundingClientRect()
        const cardCenterX = cardRect.left + cardWidth / 2
        const cardCenterY = cardRect.top + cardHeight / 2
        const x = ((event.x - cardCenterX) * 2) / cardWidth
        const y = ((cardCenterY - event.y) * 2) / cardHeight

        let angle = Math.atan(x / y) // <-- This is NOT how you convert to polar cooridates, well it kinda is exept now x is y and y is x because we want to calculate the direction the glare should be comming from
        const distanceFromCorner = Math.sqrt((x - 1) ** 2 + (y - 1) ** 2) // <-- This is a cool little trick, the -1 on the x an y coordinate is effective the same as saying "make the origin of the glare [1, 1]"

        cardGlare.style.backgroundImage = `linear-gradient(${angle}rad, rgba(255, 255, 255, 0) ${distanceFromCorner * 50 + 50}%, rgba(255, 255, 255, 0.15) ${
            distanceFromCorner * 50 + 60
        }%, rgba(255, 255, 255, 0.05) 100%)`

        card.style.transform = `rotateX(${y * 10}deg) rotateY(${x * 10}deg)`
    }
</script>

<div id="song-card-wrapper" class="h-fit" on:mousemove={(event) => rotateCard(event)} role="button" tabindex="0" on:mouseleave={() => (card.style.transform = null)}>
    <div bind:this={card} id="song-card" class="relative w-56 transition-all duration-200 ease-out">
        <img id="card-image" class="aspect-square w-full rounded-md object-cover" src="{mediaData.image}?width=224&height=224" alt="{mediaData.name} art" />
        <div bind:this={cardGlare} id="song-glare" class="absolute top-0 aspect-square w-full opacity-0 transition-opacity duration-1000 ease-out"></div>
        <div id="card-label" class="items-end p-2 text-sm">
            <span>
                {mediaData.name}
                <div class="text-neutral-400">{Array.from(mediaData.artists, (artist) => artist.name).join(', ')}</div>
            </span>
        </div>
    </div>
</div>

<style>
    #song-card-wrapper {
        perspective: 1000px;
        perspective-origin: center;
    }
    #song-card:hover {
        scale: 1.05;
    }
    #song-card:hover > #song-glare {
        opacity: 1;
    }
    /* #card-image {
        mask-image: linear-gradient(to bottom, black, rgba(0, 0, 0, 0));
    }
    #card-label {
        background-image: linear-gradient(to top, black 0%, transparent 30%);
    } */
</style>
