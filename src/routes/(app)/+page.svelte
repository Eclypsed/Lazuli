<script lang="ts">
    import type { PageData } from './$types'
    import Loader from '$lib/components/util/loader.svelte'
    import AlbumCard from '$lib/components/media/albumCard.svelte'
    import PlaylistCard from '$lib/components/media/playlistCard.svelte'

    export let data: PageData
</script>

<div id="main" class="grid">
    {#await data.recommendations}
        <Loader />
    {:then recommendations}
        <div id="card-wrapper" class="grid w-full gap-4 justify-self-center px-[5%]">
            {#each recommendations as mediaItem}
                {#if mediaItem.type === 'album'}
                    <AlbumCard album={mediaItem} />
                {:else if mediaItem.type === 'playlist'}
                    <PlaylistCard playlist={mediaItem} />
                {/if}
            {/each}
        </div>
    {/await}
</div>

<style>
    @media (min-width: 350px) {
        #card-wrapper {
            grid-template-columns: repeat(2, 1fr);
        }
    }
    @media (min-width: 550px) {
        #card-wrapper {
            grid-template-columns: repeat(3, 1fr);
        }
    }
    @media (min-width: 750px) {
        #card-wrapper {
            grid-template-columns: repeat(4, 1fr);
        }
    }
    @media (min-width: 950px) {
        #card-wrapper {
            grid-template-columns: repeat(5, 1fr);
        }
    }
    @media (min-width: 1150px) {
        #card-wrapper {
            grid-template-columns: repeat(6, 1fr);
        }
    }
    @media (min-width: 1350px) {
        #card-wrapper {
            grid-template-columns: repeat(7, 1fr);
        }
    }
    @media (min-width: 1550px) {
        #card-wrapper {
            grid-template-columns: repeat(8, 1fr);
        }
    }
    @media (min-width: 2200px) {
        #card-wrapper {
            grid-template-columns: repeat(9, 1fr);
        }
    }
    @media (min-width: 3000px) {
        #card-wrapper {
            grid-template-columns: repeat(10, 1fr);
        }
    }
</style>
