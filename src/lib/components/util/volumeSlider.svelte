<script lang="ts">
    import Slider from '$lib/components/util/slider.svelte'
    import IconButton from '$lib/components/util/iconButton.svelte'
    import { onMount } from 'svelte'

    export let volume = 0

    let muted = false
    let storedVolume: number

    const getVolume = (): number => {
        const currentVolume = localStorage.getItem('volume')
        if (currentVolume) return Number(currentVolume)

        const defaultVolume = 100
        localStorage.setItem('volume', defaultVolume.toString())
        return defaultVolume
    }

    const setVolume = (volume: number): void => {
        if (Number.isFinite(volume)) localStorage.setItem('volume', Math.round(volume).toString())
    }

    onMount(() => (storedVolume = getVolume()))

    $: changeVolume(storedVolume)
    const changeVolume = (newVolume: number) => {
        if (typeof newVolume === 'number' && !isNaN(newVolume)) setVolume(newVolume)
    }

    $: volume = muted ? 0 : storedVolume
</script>

<div id="volume-slider" class="flex h-10 w-fit flex-shrink-0 flex-row-reverse items-center gap-2">
    <IconButton halo={false} on:click={() => (muted = !muted)}>
        <i slot="icon" class="fa-solid {volume > 50 ? 'fa-volume-high' : volume > 0 ? 'fa-volume-low' : 'fa-volume-xmark'} w-full text-center text-base" />
    </IconButton>
    <div id="slider-wrapper" class="w-0 transition-all duration-500">
        <Slider bind:value={storedVolume} />
    </div>
</div>

<style>
    #volume-slider:hover > #slider-wrapper {
        width: 6rem;
    }
    #slider-wrapper:focus-within {
        width: 6rem;
    }
</style>
