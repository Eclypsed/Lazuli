<script lang="ts">
    import SearchBar from '$lib/components/util/searchBar.svelte'
    import type { LayoutData } from './$types'
    import NavTab from '$lib/components/util/navTab.svelte'
    import MixTab from '$lib/components/util/mixTab.svelte'
    import MediaPlayer from '$lib/components/media/mediaPlayer.svelte'
    import { goto } from '$app/navigation'
    import IconButton from '$lib/components/util/iconButton.svelte'

    export let data: LayoutData

    let mixData = [
        {
            name: 'J-Core Mix',
            color: 'red',
            id: 'SomeId',
        },
        {
            name: 'Best of: 葉月ゆら',
            color: 'purple',
            id: 'SomeId',
        },
    ]

    $: currentPathname = data.url.pathname

    let newMixNameInputOpen = false

    // I'm thinking I might want to make /albums, /artists, and /playlists all there own routes and just wrap them in a (library) layout
</script>

<main id="grid-wrapper" class="h-full">
    <nav id="navbar" class="items-center">
        <strong class="pl-6 text-3xl">
            <i class="fa-solid fa-record-vinyl mr-1" />
            Lazuli
        </strong>
        <SearchBar />
        <div class="flex h-full justify-end p-4">
            <IconButton halo={true} on:click={() => goto('/user')}>
                <i slot="icon" class="fa-solid fa-user text-lg" />
            </IconButton>
        </div>
    </nav>
    <section id="sidebar" class="relative pt-4 text-sm font-normal">
        <div class="mb-10">
            <NavTab label="Home" icon="fa-solid fa-wave-square" redirect="/" disabled={currentPathname === '/'} />
            <NavTab label="Playlists" icon="fa-solid fa-bars-staggered" redirect="/playlists" disabled={/^\/playlists.*$/.test(currentPathname)} />
            <NavTab label="Library" icon="fa-solid fa-book" redirect="/library" disabled={/^\/library.*$/.test(currentPathname)} />
        </div>
        <h1 class="mb-1 flex h-5 items-center justify-between pl-6 text-sm text-neutral-400">
            Your Mixes
            <IconButton halo={true} on:click={() => (mixData = [{ name: 'New Mix', color: 'grey', id: 'SomeId' }, ...mixData])}>
                <i slot="icon" class="fa-solid fa-plus" />
            </IconButton>
        </h1>
        <div>
            {#each mixData as mix}
                <MixTab {...mix} />
            {/each}
        </div>
    </section>
    <section id="content-wrapper" class="no-scrollbar overflow-x-clip overflow-y-scroll pr-8">
        <slot />
    </section>
    <MediaPlayer />
</main>

<style>
    #grid-wrapper,
    #navbar {
        display: grid;
        column-gap: 3rem;
        grid-template-columns: 12rem auto 12rem;
    }

    #grid-wrapper {
        row-gap: 1rem;
        grid-template-rows: 4.5rem auto;
    }

    #navbar {
        grid-area: 1 / 1 / 2 / 4;
    }
    #sidebar {
        grid-area: 2 / 1 / 3 / 2;
    }
</style>
