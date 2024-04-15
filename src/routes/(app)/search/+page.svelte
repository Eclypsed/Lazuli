<script lang="ts">
    import { currentlyPlaying } from '$lib/stores'
    import type { PageServerData } from './$types'

    export let data: PageServerData
</script>

{#if data.searchResults}
    {#await data.searchResults then searchResults}
        <section class="flex w-full flex-col items-center gap-2">
            {#each searchResults as searchResult}
                <div class="flex h-20 w-full max-w-screen-md gap-4 bg-black p-2">
                    <button
                        id="searchResult"
                        on:click={() => {
                            if (searchResult.type === 'song') $currentlyPlaying = searchResult
                        }}
                        class="grid aspect-square h-full place-items-center bg-cover bg-center bg-no-repeat"
                        style="--thumbnail: url('/api/remoteImage?url={searchResult.thumbnail}')"
                    >
                        <i class="fa-solid fa-play opacity-0" />
                    </button>
                    <div>
                        <div>{searchResult.name}</div>
                        {#if 'artists' in searchResult && searchResult.artists}
                            <div>{searchResult.artists.map((artist) => artist.name).join(', ')}</div>
                        {:else if 'createdBy' in searchResult && searchResult.createdBy}
                            <div>{searchResult.createdBy?.name}</div>
                        {/if}
                    </div>
                </div>
            {/each}
        </section>
    {/await}
{/if}

<style>
    #searchResult {
        background-image: var(--thumbnail);
    }
    #searchResult:hover {
        background-image: linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), var(--thumbnail);
    }
    #searchResult:hover > i {
        opacity: 100%;
    }
</style>
