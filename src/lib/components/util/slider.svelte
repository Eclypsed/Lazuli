<script lang="ts">
    export let value = 0

    let sliderThumb: HTMLSpanElement, sliderTrail: HTMLSpanElement

    const trackThumb = (sliderPos: number): void => {
        if (sliderThumb) sliderThumb.style.left = `${sliderPos}%`
        if (sliderTrail) sliderTrail.style.right = `${100 - sliderPos}%`
    }

    $: trackThumb(value)

    const handleKeyPress = (key: string) => {
        if ((key === 'ArrowRight' || key === 'ArrowUp') && value < 100) return (value += 1)
        if ((key === 'ArrowLeft' || key === 'ArrowDown') && value > 0) return (value -= 1)
    }
</script>

<div
    id="slider-track"
    class="relative isolate h-1 w-full rounded-full bg-neutral-600"
    role="slider"
    tabindex="0"
    aria-valuenow={value}
    aria-valuemin="0"
    aria-valuemax="100"
    on:keydown={(event) => handleKeyPress(event.key)}
>
    <input type="range" class="absolute z-10 h-1 w-full" step="any" min="0" max="100" bind:value tabindex="-1" aria-hidden="true" aria-disabled="true" />
    <span bind:this={sliderTrail} id="slider-trail" class="absolute left-0 h-1 rounded-full bg-white transition-colors" />
    <span bind:this={sliderThumb} id="slider-thumb" class="absolute top-1/2 aspect-square h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 transition-opacity duration-300" />
</div>

<style>
    input[type='range'] {
        appearance: none;
        cursor: pointer;
        opacity: 0;
    }
    #slider-track:hover > #slider-trail {
        background-color: var(--lazuli-primary);
    }
    #slider-track:focus > #slider-trail {
        background-color: var(--lazuli-primary);
    }
    #slider-track:hover > #slider-thumb {
        opacity: 1;
    }
    #slider-track:focus > #slider-thumb {
        opacity: 1;
    }
</style>
