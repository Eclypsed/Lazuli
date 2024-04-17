<script lang="ts">
    import { queue } from '$lib/stores'
    import type { PageServerData } from './$types'

    export let data: PageServerData

    const formatTime = (seconds: number): string => {
        seconds = Math.floor(seconds)
        const hours = Math.floor(seconds / 3600)
        seconds = seconds - hours * 3600
        const minutes = Math.floor(seconds / 60)
        seconds = seconds - minutes * 60
        return hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}` : `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
</script>

{#if data.searchResults}
    {#await data.searchResults then searchResults}
        <section class="flex w-full flex-col items-center gap-2">
            {#each searchResults as searchResult}
                <div class="flex h-20 w-full max-w-screen-md gap-4 bg-black p-2">
                    <button
                        id="searchResult"
                        on:click={() => {
                            if (searchResult.type === 'song') $queue.enqueue(searchResult)
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
                    {#if 'duration' in searchResult && searchResult.duration}
                        <span class="justify-self-end">{formatTime(searchResult.duration)}</span>
                    {/if}
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
