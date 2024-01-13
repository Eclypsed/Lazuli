<script>
    export let header = null
    export let cardDataList

    import Card from '$lib/components/media/mediaCard.svelte'
</script>

<section class="overflow-visible">
    {#if header}
        <h1 class="text-4xl"><strong>{header}</strong></h1>
    {/if}
    <div class="no-scrollbar flex gap-6 overflow-y-hidden overflow-x-scroll py-4">
        {#each cardDataList as cardData}
            <Card mediaData={cardData} />
        {/each}
    </div>
</section>
