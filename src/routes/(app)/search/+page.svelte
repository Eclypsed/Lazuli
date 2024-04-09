<script lang="ts">
    import type { PageServerData } from './$types'

    export let data: PageServerData
</script>

{#if data.searchResults}
    {#await data.searchResults then searchResults}
        {#each searchResults as searchResult}
            <div>{searchResult.name} - {searchResult.type}</div>
        {/each}
    {/await}
{/if}
