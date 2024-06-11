<script lang="ts">
    import { goto } from '$app/navigation'
    import { itemDisplayState } from '$lib/stores'
    import type { LayoutData } from './$types.js'
    import { fade } from 'svelte/transition'
    import IconButton from '$lib/components/util/iconButton.svelte'

    export let data: LayoutData

    $: currentPathname = data.url.pathname
</script>

<main class="py-8">
    <nav id="nav-options" class="mb-8 flex h-12 justify-between">
        <section class="relative flex h-full gap-4">
            <button disabled={/^\/library$/.test(currentPathname)} class="library-tab h-full px-1" on:click={() => goto('/library')}>History</button>
            <button disabled={/^\/library\/albums.*$/.test(currentPathname)} class="library-tab h-full px-1" on:click={() => goto('/library/albums')}>Albums</button>
            <button disabled={/^\/library\/artists.*$/.test(currentPathname)} class="library-tab h-full px-1" on:click={() => goto('/library/artists')}>Artists</button>
            <button disabled={/^\/library\/collection.*$/.test(currentPathname)} class="library-tab h-full px-1" on:click={() => goto('/library/collection')}>My Collection</button>
        </section>
        <section class="flex h-full justify-self-end">
            <IconButton disabled={$itemDisplayState === 'list'} on:click={() => ($itemDisplayState = 'list')}>
                <i slot="icon" class="fa-solid fa-list {$itemDisplayState === 'list' ? 'text-lazuli-primary' : 'text-white'}" />
            </IconButton>
            <IconButton disabled={$itemDisplayState === 'grid'} on:click={() => ($itemDisplayState = 'grid')}>
                <i slot="icon" class="fa-solid fa-grip {$itemDisplayState === 'grid' ? 'text-lazuli-primary' : 'text-white'}" />
            </IconButton>
        </section>
    </nav>
    {#key currentPathname}
        <div in:fade={{ duration: 200, delay: 200 }} out:fade={{ duration: 200 }}>
            <slot />
        </div>
    {/key}
</main>

<style>
    button.library-tab[disabled] {
        color: var(--lazuli-primary);
        border-top: 2px solid var(--lazuli-primary);
        background: linear-gradient(to bottom, var(--lazuli-primary) -150%, transparent 50%);
    }
</style>
