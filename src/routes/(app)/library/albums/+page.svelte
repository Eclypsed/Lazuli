<script lang="ts">
    import type { PageServerData } from './$types'
    import { itemDisplayState } from '$lib/stores'
    import Loader from '$lib/components/util/loader.svelte'
    import AlbumCard from './albumCard.svelte'
    import ListItem from '$lib/components/media/listItem.svelte'

    export let data: PageServerData
</script>

<section>
    {#await data.albums}
        <Loader />
    {:then albums}
        {#if 'error' in albums}
            <h1>{albums.error}</h1>
        {:else if $itemDisplayState === 'list'}
            <div class="text-md flex flex-col gap-4">
                <!-- .slice is temporary to mimic performance with pagination -->
                {#each albums.slice(0, 100) as album}
                    <ListItem mediaItem={album} />
                {/each}
            </div>
        {:else}
            <div id="library-wrapper">
                <!-- .slice is temporary to mimic performance with pagination -->
                {#each albums as album}
                    <AlbumCard {album} />
                {/each}
            </div>
        {/if}
    {/await}
</section>

<style>
    #library-wrapper {
        display: grid;
        /* gap: 1.5rem; */
        grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
    }
    /* This caps the maxiumn number of columns at 10. Beyond that point the cards will continuously get larger */
    @media (min-width: calc(13rem * 10)) {
        #library-wrapper {
            grid-template-columns: repeat(10, 1fr);
        }
    }
</style>
