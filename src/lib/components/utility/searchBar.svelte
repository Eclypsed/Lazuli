<script>
    let searchBar, searchInput
    let searchOpen = false

    let searchRecommendations = null
    const toggleSearchMenu = (open) => {
        searchOpen = open

        if (open) {
            searchBar.style.borderColor = 'rgb(100, 100, 100)'
            searchRecommendations = ['Psycho Lily', 'Iceborn', 'HYPER4ID', 'Parousia', 'Ragnarok', 'Betwixt & Between']
        } else {
            searchBar.style.borderColor = 'transparent'
            searchRecommendations = null
        }
    }

    const triggerSearch = (searchQuery) => {
        console.log(`Search for: ${searchQuery}`)
        // Redirect To '/search' route with query parameter '?query=searchQuery'
    }
</script>

<search
    role="search"
    bind:this={searchBar}
    class="relative flex h-full w-full items-center gap-2.5 justify-self-center rounded-full border-2 border-transparent bg-black px-4 py-2"
    on:focusout={() => {
        setTimeout(() => {
            // This is a completely stupid thing you have to do, if there is not timeout, the active element will be the body of the document and not the newly focused element
            if (!searchBar.contains(document.activeElement)) {
                toggleSearchMenu(false)
            }
        }, 1)
    }}
>
    <button
        on:click|preventDefault={(event) => {
            if (searchInput.value.trim() === '') {
                if (event.pointerType === 'mouse') toggleSearchMenu(!searchOpen)
                if (searchOpen) searchInput.focus()
            } else {
                triggerSearch(searchInput.value)
            }
        }}
    >
        <i class="fa-solid fa-magnifying-glass transition-colors duration-200 hover:text-lazuli-primary" />
    </button>
    <input
        bind:this={searchInput}
        type="text"
        name="search"
        class="w-full bg-transparent outline-none"
        placeholder="Let's find some music"
        autocomplete="off"
        on:focus={() => toggleSearchMenu(true)}
        on:keypress={(event) => {
            if (event.key === 'Enter') triggerSearch(searchInput.value)
        }}
    />
    {#if searchRecommendations}
        <div class="absolute left-0 top-full flex w-full flex-col bg-neutral-950">
            {#each searchRecommendations as recommendation}
                <button class="w-full p-4 text-left" on:click|preventDefault={() => triggerSearch(recommendation)}>
                    {recommendation}
                </button>
            {/each}
        </div>
    {/if}
</search>
