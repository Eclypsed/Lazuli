<script>
    export let header = null
    export let cardDataList

    import Card from '$lib/components/media/mediaCard.svelte'
    import IconButton from '$lib/components/utility/iconButton.svelte'

    let scrollable,
        scrollpos = 0
</script>

<section>
    <div class="flex h-10 items-center justify-between">
        {#if header}
            <h1 class="text-4xl"><strong>{header}</strong></h1>
        {/if}
        <div class="flex h-full gap-2">
            <IconButton disabled={scrollpos < 0.01} on:click={() => (scrollable.scrollLeft -= scrollable.clientWidth)}>
                <i slot="icon" class="fa-solid fa-angle-left" />
            </IconButton>
            <IconButton disabled={scrollpos > 0.99} on:click={() => (scrollable.scrollLeft += scrollable.clientWidth)}>
                <i slot="icon" class="fa-solid fa-angle-right" />
            </IconButton>
        </div>
    </div>
    <div
        bind:this={scrollable}
        on:scroll={() => (scrollpos = scrollable.scrollLeft / (scrollable.scrollWidth - scrollable.clientWidth))}
        class="no-scrollbar flex gap-6 overflow-y-hidden overflow-x-scroll scroll-smooth py-4"
    >
        {#each cardDataList as cardData}
            <Card mediaData={cardData} />
        {/each}
    </div>
</section>
