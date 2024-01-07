<script>
    import HamburgerMenu from './hamburgerMenu.svelte'
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
<nav id="navbar" class="fixed left-0 top-0 isolate z-10 h-16 w-full">
    <div class="grid h-full grid-cols-3">
        <div class="flex h-full items-center gap-5 py-4 pl-6">
            <HamburgerMenu>
                <ol slot="menu-items" class="overflow-hidden rounded-lg border-2 border-neutral-800 bg-neutral-925 p-2">
                    <li>
                        <button class="w-full rounded-md px-3 py-2 text-left hover:bg-neutral-900" on:click={() => goto('/settings')}>
                            <i class="fa-solid fa-gear mr-1" />
                            Settings
                        </button>
                    </li>
                </ol>
            </HamburgerMenu>
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
        <SearchBar />
    </div>
    {#if windowY > 0}
        <div transition:fade={{ duration: 150 }} id="navbar-background" class="absolute left-0 top-0 -z-10 h-full w-full bg-neutral-925" />
        <!-- This would be a cool place for personalization -->
    {/if}
</nav>
