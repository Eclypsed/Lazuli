<script lang="ts">
    import type { PageServerData } from './$types'

    export let data: PageServerData
</script>

{#if data.searchResults}
    {#each data.searchResults as searchResult}
        <div>{searchResult.name} - {searchResult.type}</div>
    {/each}
{/if}
