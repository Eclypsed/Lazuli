<script lang="ts">
    import ScrollableCardMenu from '$lib/components/media/scrollableCardMenu.svelte'
    import type { PageData } from './$types'
    import Loader from '$lib/components/util/loader.svelte'

    export let data: PageData
</script>

<div id="main">
    {#await data.recommendations}
        <Loader />
    {:then recommendations}
        <ScrollableCardMenu header={'Listen Again'} cardDataList={recommendations} />
    {/await}
</div>
