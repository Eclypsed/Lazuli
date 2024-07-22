<script lang="ts">
    export let toggled = false
    export let disabled = false
    export let halo = false

    import { createEventDispatcher } from 'svelte'

    const dispatch = createEventDispatcher()
</script>

<button
    class:toggled
    class:disabled
    class:halo
    class="relative grid aspect-square h-full place-items-center transition-transform duration-75 active:scale-90"
    on:click|preventDefault|stopPropagation={() => dispatch('click')}
    {disabled}
>
    <slot name="icon" />
</button>

<style>
    button.disabled {
        color: rgb(82, 82, 82);
    }
    button:not(.disabled).halo::before {
        content: '';
        width: 0;
        height: 0;
        background-color: color-mix(in srgb, var(--color, var(--lazuli-primary)) 20%, transparent);
        border-radius: 100%;
        transition-property: width height;
        transition-duration: 200ms;
        position: absolute;
    }
    button:not(.disabled).halo:hover::before {
        width: 130%;
        height: 130%;
    }
    button :global(> :first-child) {
        transition: color 200ms;
    }
    button:not(.disabled).toggled :global(> :first-child) {
        color: var(--color, var(--lazuli-primary));
    }
    button:not(.disabled):not(.toggled):hover :global(> :first-child) {
        color: var(--hover-color, var(--color, var(--lazuli-primary)));
    }
</style>
