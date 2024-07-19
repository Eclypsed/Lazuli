<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte'

    export let value = 0
    export let max = 100
    export let thickness: 'thick' | 'thin' = 'thick'

    const seekingDispatch = createEventDispatcher<{ seeking: { value: number } }>()
    const seekedDispatch = createEventDispatcher<{ seeked: { value: number } }>()

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
    class="relative isolate {thickness === 'thick' ? 'h-1' : 'h-0.5'} w-full rounded bg-neutral-800"
    style="--slider-color: var(--lazuli-primary)"
    role="slider"
    tabindex="0"
    aria-valuenow={value}
    aria-valuemin="0"
    aria-valuemax={max}
    on:keydown={(event) => handleKeyPress(event.key)}
>
    <input
        on:input={(event) => seekingDispatch('seeking', { value: Number(event.currentTarget.value) })}
        on:change={(event) => seekedDispatch('seeked', { value: Number(event.currentTarget.value) })}
        type="range"
        class="absolute z-10 {thickness === 'thick' ? 'h-1' : 'h-0.5'} w-full"
        step="any"
        min="0"
        {max}
        bind:value
        tabindex="-1"
        aria-hidden="true"
        aria-disabled="true"
    />
    <span bind:this={sliderTrail} id="slider-trail" class="absolute left-0 {thickness === 'thick' ? 'h-1' : 'h-0.5'} rounded-full bg-white transition-colors" />
    <span bind:this={sliderThumb} id="slider-thumb" class="absolute top-1/2 aspect-square {thickness === 'thick' ? 'h-3.5' : 'h-2.5'} -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0" />
</div>

<style>
    input[type='range'] {
        appearance: none;
        cursor: pointer;
        opacity: 0;
    }
    #slider-track:hover > #slider-trail,
    #slider-track:focus > #slider-trail {
        background-color: var(--slider-color);
    }
    #slider-track:hover > #slider-thumb,
    #slider-track:focus > #slider-thumb {
        opacity: 1;
    }
    #slider-track:not(:hover):not(:focus) > #slider-trail {
        transition: right 50ms linear;
    }
</style>
