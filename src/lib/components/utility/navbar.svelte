<script>
    import IconButton from './iconButton.svelte'
    import SearchBar from './searchBar.svelte'
    import { goto, afterNavigate } from '$app/navigation'
    import { page } from '$app/stores'
    import { fade } from 'svelte/transition'

    let previousPage = null
    afterNavigate(({ from }) => {
        if (from) previousPage = from.url
    })

    let windowY = 0
</script>

<svelte:window bind:scrollY={windowY} />
<nav id="navbar" class="sticky left-0 top-0 isolate z-10 h-16">
    <div class="flex h-full items-center justify-between gap-6 px-6">
        <div class="w-full max-w-2xl">
            <SearchBar />
        </div>
        <div class="flex h-full gap-4 py-4">
            {#if previousPage && $page.url.pathname !== '/'}
                <IconButton on:click={() => history.back()}>
                    <i slot="icon" class="fa-solid fa-arrow-left text-xl" />
                </IconButton>
            {/if}
            {#if $page.url.pathname !== '/'}
                <IconButton on:click={() => goto('/')}>
                    <i slot="icon" class="fa-solid fa-house text-xl" />
                </IconButton>
            {/if}
        </div>
    </div>
    {#if windowY > 0}
        <div transition:fade={{ duration: 150 }} id="navbar-background" class="absolute left-0 top-0 -z-10 h-full w-full bg-neutral-925" />
    {/if}
</nav>
