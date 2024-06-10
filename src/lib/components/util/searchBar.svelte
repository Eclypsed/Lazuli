<script lang="ts">
    import { goto } from '$app/navigation'

    let searchBar: HTMLElement, searchInput: HTMLInputElement

    const triggerSearch = (query: string) => {
        const searchParams = new URLSearchParams({ query })
        goto(`/search?${searchParams.toString()}`)
    }
</script>

<search
    role="search"
    bind:this={searchBar}
    class="relative flex h-10 w-full min-w-60 max-w-screen-sm items-center gap-2.5 rounded-lg border-2 border-transparent px-4 py-2"
    style="background-color: rgba(82, 82, 82, 0.25);"
>
    <button
        class="aspect-square h-6 transition-colors duration-200 hover:text-lazuli-primary"
        on:click|preventDefault={() => {
            if (searchInput.value.trim() !== '') {
                triggerSearch(searchInput.value)
            }
        }}
    >
        <i class="fa-solid fa-magnifying-glass" />
    </button>
    <input
        bind:this={searchInput}
        type="text"
        name="search"
        class="w-full bg-transparent outline-none"
        placeholder="Let's find some music"
        autocomplete="off"
        on:keypress={(event) => {
            if (event.key === 'Enter') triggerSearch(searchInput.value)
        }}
    />
    <button class="aspect-square h-6 transition-colors duration-200 hover:text-lazuli-primary" on:click|preventDefault={() => (searchInput.value = '')}>
        <i class="fa-solid fa-xmark" />
    </button>
</search>
