<script lang="ts">
    import SearchBar from '$lib/components/util/searchBar.svelte'
    import type { LayoutData } from './$types'
    import NavTab from '$lib/components/navbar/navTab.svelte'
    import MediaPlayer from '$lib/components/media/mediaPlayer.svelte'
    import { goto } from '$app/navigation'
    import IconButton from '$lib/components/util/iconButton.svelte'

    export let data: LayoutData

    $: currentPathname = data.url.pathname
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
    <section id="sidebar" class="pt-4 font-light">
        <NavTab label={'Home'} icon={'fa-solid fa-wave-square'} redirect={'/'} disabled={currentPathname === '/'} />
        <NavTab label={'Playlists'} icon={'fa-solid fa-bars-staggered'} redirect={'/playlists'} disabled={/^\/playlists.*$/.test(currentPathname)} />
        <NavTab label={'Library'} icon={'fa-solid fa-book'} redirect={'/library'} disabled={/^\/library.*$/.test(currentPathname)} />
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
        column-gap: 1rem;
        grid-template-columns: 14rem auto 14rem;
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
    #content-wrapper {
        grid-area: 2 / 2 / 3 / 4;
    }
</style>
