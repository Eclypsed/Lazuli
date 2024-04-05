<script lang="ts">
    import ScrollableCardMenu from '$lib/components/media/scrollableCardMenu.svelte'
    import type { PageData } from './$types'

    export let data: PageData
</script>

<div id="main">
    <ScrollableCardMenu header={'Listen Again'} cardDataList={data.recommendations} />
    <!-- <h1 class="mb-6 text-4xl"><strong>Listen Again</strong></h1>
    <div class="flex flex-wrap justify-between gap-6">
        {#each data.recommendations as recommendation}
            <MediaCard mediaItem={recommendation} />
        {/each}
    </div> -->
</div>
