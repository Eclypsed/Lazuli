<script>
    import Slider from '$lib/components/utility/slider.svelte'
    import { getVolume, setVolume } from '$lib/utils/utils.js'
    import { onMount } from 'svelte'

    export let volume = 0

    let muted = false
    let storedVolume

    onMount(() => (storedVolume = getVolume()))

    $: changeVolume(storedVolume)
    const changeVolume = (newVolume) => {
        if (typeof newVolume === 'number' && !isNaN(newVolume)) setVolume(newVolume)
    }

    $: volume = muted ? 0 : storedVolume
</script>

<div id="volume-slider" class="flex h-full flex-row-reverse items-center gap-2">
    <button id="volume-toggle" class="grid aspect-square h-full place-items-center transition-colors hover:text-lazuli-primary" on:click={() => (muted = !muted)}>
        <i class="fa-solid {volume > 50 ? 'fa-volume-high' : volume > 0 ? 'fa-volume-low' : 'fa-volume-xmark'} w-full text-left text-base" />
    </button>
    <div id="slider-wrapper" class="w-0 transition-all duration-300">
        <Slider bind:value={storedVolume} />
    </div>
</div>

<style>
    #volume-slider:hover > #slider-wrapper {
        width: 8rem;
    }
    #slider-wrapper:focus-within {
        width: 8rem;
    }
</style>
