<script lang="ts">
    export let header: string
    export let cardDataList: MediaItem[]

    import MediaCard from '$lib/components/media/mediaCard.svelte'
    import IconButton from '$lib/components/util/iconButton.svelte'

    let scrollable: HTMLDivElement,
        scrollableWidth: number,
        isScrollable = false,
        scrollpos = 0

    $: isScrollable = scrollable?.scrollWidth > scrollableWidth
    $: scrollpos = scrollable?.scrollLeft / (scrollable?.scrollWidth - scrollableWidth)
</script>

<section>
    <div class="flex h-10 items-center justify-between">
        <h1 class="text-4xl"><strong>{header}</strong></h1>
        <div class="flex h-full gap-2">
            <IconButton disabled={scrollpos < 0.01 || !isScrollable} on:click={() => (scrollable.scrollLeft -= scrollable.clientWidth)}>
                <i slot="icon" class="fa-solid fa-angle-left" />
            </IconButton>
            <IconButton disabled={scrollpos > 0.99 || !isScrollable} on:click={() => (scrollable.scrollLeft += scrollable.clientWidth)}>
                <i slot="icon" class="fa-solid fa-angle-right" />
            </IconButton>
        </div>
    </div>
    <div
        bind:this={scrollable}
        bind:clientWidth={scrollableWidth}
        on:scroll={() => (scrollpos = scrollable.scrollLeft / (scrollable.scrollWidth - scrollable.clientWidth))}
        class="no-scrollbar flex gap-6 overflow-y-hidden overflow-x-scroll scroll-smooth p-4"
    >
        {#each cardDataList as mediaItem}
            <MediaCard {mediaItem} />
        {/each}
    </div>
</section>
