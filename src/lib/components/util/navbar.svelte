<script lang="ts">
    import IconButton from './iconButton.svelte'
    import MingcuteMenuLine from '~icons/mingcute/menu-line'
    import { goto } from '$app/navigation'
    import { createEventDispatcher } from 'svelte'

    const dispatch = createEventDispatcher()

    let searchInput: HTMLInputElement, searchBarWidth: number

    const HIDE_SEARCHBAR_BREAKPOINT_PX = 300
    $: showSearchbar = searchBarWidth > HIDE_SEARCHBAR_BREAKPOINT_PX

    let miniSearchOpen: boolean = false

    function search() {
        if (searchInput.value.replace(/\s/g, '').length === 0) return

        const searchParams = new URLSearchParams({ query: searchInput.value })
        goto(`/search?${searchParams.toString()}`)
    }
</script>

<nav id="navbar" class="grid h-[4.5rem] items-center gap-2.5 p-3.5">
    {#if !miniSearchOpen}
        <div class="mr-4 flex h-full items-center">
            <div class="h-full p-1">
                <IconButton halo={true} on:click={() => dispatch('opensidebar')}>
                    <MingcuteMenuLine slot="icon" class="text-lg" />
                </IconButton>
            </div>
            <!--                                                                                                              --------------This is a placeholder image--------------   -->
            <button on:click={() => goto('/')} class="mx-2.5 h-full w-20 bg-center bg-no-repeat" style="background-image: url(https://music.youtube.com/img/on_platform_logo_dark.svg);" />
        </div>
        <div bind:clientWidth={searchBarWidth} class="h-full">
            {#if showSearchbar}
                <search
                    role="search"
                    class="relative flex h-full w-full max-w-xl items-center gap-2.5 rounded-lg border border-[rgba(255,255,255,0.1)] px-4 py-2 text-neutral-400"
                    style="background-color: rgba(255,255,255, 0.07);"
                >
                    <IconButton on:click={search}>
                        <i slot="icon" class="fa-solid fa-magnifying-glass" />
                    </IconButton>
                    <input
                        bind:this={searchInput}
                        type="search"
                        name="search"
                        class="h-full w-full text-ellipsis bg-transparent text-neutral-300 outline-none placeholder:text-neutral-400"
                        placeholder="Let's find some music"
                        autocomplete="off"
                        autocorrect="off"
                        autocapitalize="off"
                        spellcheck="false"
                        on:keypress={(event) => (event.key === 'Enter' ? search() : null)}
                    />
                    <IconButton on:click={() => (searchInput.value = '')}>
                        <i slot="icon" class="fa-solid fa-xmark" />
                    </IconButton>
                </search>
            {/if}
        </div>
        <div class="flex h-full gap-3 justify-self-end p-1">
            <IconButton halo={true} on:click={() => goto('/user')}>
                <i slot="icon" class="fa-solid fa-user text-lg" />
            </IconButton>
            {#if !showSearchbar}
                <IconButton on:click={() => (miniSearchOpen = true)}>
                    <i slot="icon" class="fa-solid fa-magnifying-glass text-lg" />
                </IconButton>
            {/if}
        </div>
    {:else}
        <IconButton on:click={() => (miniSearchOpen = false)}>
            <i slot="icon" class="fa-solid fa-arrow-left text-lg" />
        </IconButton>
        <input
            bind:this={searchInput}
            type="search"
            name="search"
            class="h-full w-full text-ellipsis bg-transparent font-medium text-neutral-300 caret-lazuli-primary outline-none placeholder:text-neutral-300"
            placeholder="Let's find some music"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            on:keypress={(event) => (event.key === 'Enter' ? search() : null)}
        />
        <IconButton on:click={() => (searchInput.value = '')}>
            <i slot="icon" class="fa-solid fa-xmark text-lg" />
        </IconButton>
    {/if}
</nav>

<style>
    #navbar {
        grid-template-columns: min-content auto min-content;
    }
    input[type='search']::-webkit-search-cancel-button {
        display: none;
    }
</style>
