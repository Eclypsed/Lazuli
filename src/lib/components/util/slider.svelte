<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte'

    export let value = 0
    export let max = 100

    const dispatch = createEventDispatcher()

    let sliderThumb: HTMLSpanElement, sliderTrail: HTMLSpanElement

    const trackThumb = (sliderPos: number): void => {
        if (sliderThumb) sliderThumb.style.left = `${(sliderPos / max) * 100}%`
        if (sliderTrail) sliderTrail.style.right = `${100 - (sliderPos / max) * 100}%`
    }

    $: trackThumb(value)
    onMount(() => trackThumb(value))

    const keyPressJumpIntervalCount = 20

    const handleKeyPress = (key: string) => {
        if ((key === 'ArrowRight' || key === 'ArrowUp') && value < max) value = Math.min(max, value + max / keyPressJumpIntervalCount)
        if ((key === 'ArrowLeft' || key === 'ArrowDown') && value > 0) value = Math.max(0, value - max / keyPressJumpIntervalCount) // For some reason this is kinda broken
    }
</script>

<div
    id="slider-track"
    class="relative isolate h-1 w-full rounded bg-neutral-600"
    style="--slider-color: var(--lazuli-primary)"
    role="slider"
    tabindex="0"
    aria-valuenow={value}
    aria-valuemin="0"
    aria-valuemax={max}
    on:keydown={(event) => handleKeyPress(event.key)}
>
    <input
        on:input={(event) => dispatch('seeking', { value: event.currentTarget.value })}
        on:change={(event) => dispatch('seeked', { value: event.currentTarget.value })}
        type="range"
        class="absolute z-10 h-1 w-full"
        step="any"
        min="0"
        {max}
        bind:value
        tabindex="-1"
        aria-hidden="true"
        aria-disabled="true"
    />
    <span bind:this={sliderTrail} id="slider-trail" class="absolute left-0 h-1 rounded-full bg-white transition-colors" />
    <span bind:this={sliderThumb} id="slider-thumb" class="absolute top-1/2 aspect-square h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 transition-opacity duration-300" />
</div>

<style>
    input[type='range'] {
        appearance: none;
        cursor: pointer;
        opacity: 0;
    }
    #slider-track:hover > #slider-trail {
        background-color: var(--slider-color);
    }
    #slider-track:focus > #slider-trail {
        background-color: var(--slider-color);
    }
    #slider-track:hover > #slider-thumb {
        opacity: 1;
    }
    #slider-track:focus > #slider-thumb {
        opacity: 1;
    }
</style>
