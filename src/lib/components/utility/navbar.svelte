<script>
    import IconButton from './iconButton.svelte'
    import SearchBar from './searchBar.svelte'
    import { goto } from '$app/navigation'
    import { page } from '$app/stores'
</script>

<nav class="sticky top-0 z-10 flex items-center justify-between p-3 text-base duration-300" style="height: 4rem;">
    <SearchBar />
    <!-- <section class="flex h-14">
        <IconButton halo={false} on:click={() => goto('/settings')}>
            <i slot="icon" class="fa-solid fa-user" />
        </IconButton>
        {#if $page.url.pathname !== '/'}
            <IconButton halo={false} on:click={() => history.back()}>
                <i slot="icon" class="fa-solid fa-arrow-left" />
            </IconButton>
            <IconButton halo={false}>
                <i slot="icon" class="fa-solid fa-magnifying-glass" />
            </IconButton>
        {/if}
    </section> -->
</nav>

<!-- New Idea: We're going to do a search button, but it will toggle a floating search bar that flys in from the top and autofocuses -->
