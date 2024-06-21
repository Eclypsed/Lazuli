<!--
    @component
    A component to help render images in a smooth and efficient way. The url passed will be fetched via Lazuli's
    remoteImage API endpoint with size parameters that are dynamically calculated base off of the image's container's
    width and height. Images are lazily loaded unless 'eager' loading is specified.

    @param thumbnailUrl A string of a URL that points to the desired image.
    @param alt Supplementary text in the event the image fails to load.
    @param loadingMethod Optional. Either the string 'lazy' or 'eager', defaults to lazy. The method by which to load the image.
    @param objectFit One of the following fill, contain, cover, none, scale-down. Specifies the object-fit styling of the image
    @param objectPosistion Optional. Specifies the object-position styling of the image. Defaults to 'center'
-->

<script lang="ts">
    import { onMount } from 'svelte'

    export let thumbnailUrl: string
    export let alt: string
    export let loadingMethod: 'lazy' | 'eager' = 'lazy'
    export let objectFit: 'fill' | 'contain' | 'cover' | 'none' | 'scale-down'
    export let objectPosition: string = 'center'

    let imageContainer: HTMLDivElement

    // TODO: Implement auto-resizing
    function updateImage(newThumbnailURL: string) {
        if (!imageContainer) return

        const width = imageContainer.clientWidth * 1.5 // 1.5x is a good compromise between sharpness and performance
        const height = imageContainer.clientHeight * 1.5

        const newImage = new Image(width, height)
        imageContainer.appendChild(newImage)

        newImage.loading = loadingMethod
        newImage.src = `/api/remoteImage?url=${newThumbnailURL}&`.concat(width > height ? `maxWidth=${width}` : `maxHeight=${height}`)
        newImage.alt = alt

        newImage.style.width = '100%'
        newImage.style.height = '100%'
        newImage.style.objectFit = objectFit
        newImage.style.objectPosition = objectPosition
        newImage.style.opacity = '0'
        newImage.style.position = 'absolute'

        function removeOldImage() {
            if (imageContainer.childElementCount > 1) {
                const oldImage = imageContainer.firstChild! as HTMLImageElement
                oldImage.style.opacity = '0'
                setTimeout(() => imageContainer.removeChild(oldImage), 500)
            }
        }

        newImage.onload = () => {
            removeOldImage()
            newImage.style.transition = 'opacity 500ms ease'
            newImage.style.opacity = '1'
        }

        newImage.onerror = () => {
            console.error(`Image from url: ${newThumbnailURL} failed to update`)
            imageContainer.removeChild(newImage)
        }
    }

    onMount(() => updateImage(thumbnailUrl))
    $: updateImage(thumbnailUrl)
</script>

<div bind:this={imageContainer} class="relative h-full w-full"></div>
