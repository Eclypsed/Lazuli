<!--
    @component
    A component to help render images in a smooth and efficient way. The url passed will be fetched via Lazuli's
    remoteImage API endpoint with size parameters that are dynamically calculated base off of the image's container's
    width and height. Images are lazily loaded unless 'eager' loading is specified.

    @param thumbnailUrl A string of a URL that points to the desired image.
    @param alt Supplementary text in the event the image fails to load.
    @param loading Optional. Either the string 'lazy' or 'eager', defaults to lazy. The method by which to load the image.
-->

<script lang="ts">
    import { onMount } from 'svelte'

    export let thumbnailUrl: string
    export let alt: string
    export let loading: 'lazy' | 'eager' = 'lazy'

    let currentSlot: number = 1 // 1 | 2

    let imageContainer: HTMLDivElement | undefined
    let slot1: HTMLImageElement | undefined
    let slot2: HTMLImageElement | undefined

    const SIZE_TO_PIXEL_FACTOR = 1.5 // Images will be fetched with a pixel density 1.5x the size of its container. This is a good compromise between sharpness and performance

    // ? Maybe implement auto-resizing
    function updateImage(newThumbnailURL: string) {
        if (!(slot1 && slot2 && imageContainer)) return

        const maxWidth = imageContainer.clientWidth * SIZE_TO_PIXEL_FACTOR
        const maxHeight = imageContainer.clientHeight * SIZE_TO_PIXEL_FACTOR

        const imageSrc = `/api/remoteImage?url=${newThumbnailURL}&${maxWidth > maxHeight ? `maxWidth=${maxWidth}` : `maxHeight=${maxHeight}`}`
        currentSlot === 1 ? (slot2.src = imageSrc) : (slot1.src = imageSrc)
    }

    onMount(() => updateImage(thumbnailUrl))
    $: updateImage(thumbnailUrl)
</script>

<div id="image-container" bind:this={imageContainer} class="grid">
    <img bind:this={slot1} {alt} {loading} class:opacity-0={currentSlot === 2} class:hidden={!slot1 || slot1.src === ''} class="h-full transition-opacity duration-500" on:load={() => (currentSlot = 1)} />
    <img bind:this={slot2} {alt} {loading} class:opacity-0={currentSlot === 1} class:hidden={!slot1 || slot2.src === ''} class="h-full transition-opacity duration-500" on:load={() => (currentSlot = 2)} />
</div>

<style>
    #image-container {
        height: var(--height);
    }
    img {
        grid-area: 1 / 1;
        object-fit: var(--object-fit);
        object-position: var(--object-position);
        border-radius: var(--border-radius);
    }
</style>
