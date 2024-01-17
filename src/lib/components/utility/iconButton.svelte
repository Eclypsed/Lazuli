<script>
    export let disabled = false
    export let halo = true

    import { createEventDispatcher } from 'svelte'

    const dispatch = createEventDispatcher()
</script>

<button
    class:disabled
    class:halo
    class="relative grid aspect-square h-full place-items-center transition-transform duration-75 active:scale-90 {disabled ? 'text-neutral-600' : ''}"
    on:click|preventDefault={() => dispatch('click')}
    {disabled}
>
    <slot name="icon" />
</button>

<style>
    button:not(.disabled).halo::before {
        content: '';
        width: 0;
        height: 0;
        background-color: color-mix(in srgb, var(--lazuli-primary) 20%, transparent);
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
    button:not(.disabled):hover :global(> :first-child) {
        color: var(--lazuli-primary);
    }
</style>
