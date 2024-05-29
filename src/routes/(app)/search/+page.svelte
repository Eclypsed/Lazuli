<script lang="ts">
    import type { PageServerData } from './$types'
    import MediaCard from '$lib/components/media/mediaCard.svelte'

    export let data: PageServerData
</script>

{#if data.searchResults}
    {#await data.searchResults then searchResults}
        <section class="flex w-full flex-wrap gap-6">
            {#each searchResults as searchResult}
                <MediaCard mediaItem={searchResult} />
            {/each}
        </section>
    {/await}
{/if}
