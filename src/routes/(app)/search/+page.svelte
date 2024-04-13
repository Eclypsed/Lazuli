<script lang="ts">
    import { currentlyPlaying } from '$lib/stores'
    import type { PageServerData } from './$types'

    export let data: PageServerData
</script>

{#if data.searchResults}
    {#await data.searchResults then searchResults}
        {#each searchResults as searchResult}
            <button
                on:click={() => {
                    if (searchResult.type === 'song') $currentlyPlaying = searchResult
                }}
                class="block bg-neutral-925">{searchResult.name} - {searchResult.type}</button
            >
        {/each}
    {/await}
{/if}
