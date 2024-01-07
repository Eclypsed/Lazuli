<script>
    import { fade, slide } from 'svelte/transition'
    import { spin } from '$lib/utils/animations'
    import { page } from '$app/stores'

    let button,
        icon,
        open = false

    $: $page.url, closeMenu()
    const closeMenu = () => {
        if (button && open) {
            button.animate(spin(), 400)
            open = false
        }
    }
</script>

<div class="relative aspect-square h-full">
    <button
        bind:this={button}
        id="button"
        class="grid h-full w-full place-items-center transition-transform duration-75 active:scale-90"
        on:click={() => {
            button.animate(spin(), 400)
            open = !open
        }}
    >
        {#if open}
            <i id="menu-icon" transition:fade={{ duration: 300 }} bind:this={icon} class="fa-solid fa-xmark" />
        {:else}
            <i id="menu-icon" transition:fade={{ duration: 300 }} bind:this={icon} class="fa-solid fa-bars" />
        {/if}
    </button>
    {#if open}
        <section transition:slide={{ duration: 200, axis: 'y' }} id="dropdown" class="absolute w-screen max-w-sm">
            <slot name="menu-items" />
        </section>
    {/if}
</div>

<style>
    #dropdown {
        top: calc(100% + 0.6rem);
    }
    #button::before {
        content: '';
        width: 0;
        height: 0;
        background-color: color-mix(in srgb, var(--lazuli-primary) 20%, transparent);
        border-radius: 100%;
        transition-property: width height;
        transition-duration: 200ms;
        position: absolute;
    }
    #menu-icon {
        font-size: 1.5rem;
        position: absolute;
        transition: color 200ms;
    }
    #button:hover > i {
        color: var(--lazuli-primary);
    }
    #button:hover::before {
        width: 130%;
        height: 130%;
    }
</style>
