<script>
    export let type

    import { createEventDispatcher } from 'svelte'
    import { onMount } from 'svelte'

    const dispatch = createEventDispatcher()

    const eventTypesIcons = {
        playing: 'fa-solid fa-pause', // Reversed - If song is playing, should be pause icon
        paused: 'fa-solid fa-play', // Reversed - If song is paused, should be play icon
        stop: 'fa-solid fa-stop',
        nexttrack: 'fa-solid fa-forward-step',
        previoustrack: 'fa-solid fa-backward-step',
    }

    $: icon = eventTypesIcons[type] // Reacitive for when the type switches between playing/paused

    onMount(() => {
        if (!(type in eventTypesIcons)) {
            throw new Error(`${type} type is not a valid mediaControl type`)
        }
    })

    const mediaControlEvent = () => {
        dispatch('mediaControlEvent', {
            eventType: type,
        })
    }
</script>

<button id="button" on:click={mediaControlEvent} class="relative z-0 aspect-square max-h-full max-w-full overflow-hidden rounded-full">
    <i class="{icon} text-3xl text-white" />
</button>

<style>
    #button:hover::before {
        background-color: rgba(0, 164, 220, 0.2);
        height: 100%;
    }
    #button::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: #00a4dc;
        border-radius: 100%;
        height: 80%;
        aspect-ratio: 1;
        transition-property: height background-color;
        transition-duration: 80ms;
        transition-timing-function: linear;
        z-index: -1;
    }
</style>
