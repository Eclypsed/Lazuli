<script>
    export let header = null
    export let cardDataList

    import Card from '$lib/components/media/mediaCard.svelte'
    import { onMount } from 'svelte'

    let scrollableWrapper,
        scrollableWrapperWidth,
        scrollable,
        scrollableWidth,
        isHovered,
        scrollpos = 0

    onMount(() => {
        scrollableWrapperWidth = scrollableWrapper.clientWidth - 96 // Account for x padding
        scrollableWidth = Math.abs(scrollableWrapperWidth - scrollable.scrollWidth)
    })
</script>

<section>
    {#if header}
        <h1 class="px-12 text-4xl"><strong>{header}</strong></h1>
    {/if}
    <div
        bind:this={scrollableWrapper}
        role="menu"
        tabindex="-1"
        class="overflow-hidden px-12 py-4"
        on:focus={() => (isHovered = true)}
        on:blur={() => (isHovered = false)}
        on:wheel={(event) => {
            if (isHovered) {
                scrollpos += event.deltaY / 2 // Change divisor to adjust speed
                scrollpos = Math.min(Math.max(0, scrollpos), scrollableWidth)
                scrollable.style.transform = `translateX(-${scrollpos}px)`
            }
        }}
    >
        <div id="scrollable" bind:this={scrollable} class="no-scrollbar flex gap-6 transition-transform duration-200 ease-out">
            {#each cardDataList as cardData}
                <Card mediaData={cardData} />
            {/each}
        </div>
    </div>
</section>
