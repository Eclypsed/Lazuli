<script lang="ts">
    import LazyImage from '$lib/components/media/lazyImage.svelte'
    import IconButton from '$lib/components/util/iconButton.svelte'
    import { goto } from '$app/navigation'
    import { queue, newestAlert } from '$lib/stores'

    export let album: Album

    const queueRef = $queue // This nonsense is to prevent an bug that causes svelte to throw an error when setting a property of the queue directly

    async function playAlbum() {
        const itemsResponse = await fetch(`/api/connections/${album.connection.id}/album/${album.id}/items`, {
            credentials: 'include',
        }).catch(() => null)

        if (!itemsResponse || !itemsResponse.ok) {
            $newestAlert = ['warning', 'Failed to play album']
            return
        }

        const data = (await itemsResponse.json()) as { items: Song[] }
        queueRef.setQueue(data.items)
    }
</script>

<div class="p-3">
    <div id="thumbnail-wrapper" class="relative aspect-square w-full overflow-clip rounded-lg">
        <button id="thumbnail" class="h-full w-full" on:click={() => goto(`/details/album?id=${album.id}&connection=${album.connection.id}`)}>
            <LazyImage thumbnailUrl={album.thumbnailUrl} alt={`${album.name} jacket`} />
        </button>
        <div id="play-button" class="absolute left-1/2 top-1/2 h-1/4 -translate-x-1/2 -translate-y-1/2 opacity-0">
            <IconButton halo={true} on:click={playAlbum}>
                <i slot="icon" class="fa-solid fa-play text-2xl" />
            </IconButton>
        </div>
    </div>
    <div class="py-2 text-center text-sm">
        <div class="line-clamp-2">{album.name}</div>
        <div class="line-clamp-2 flex justify-center text-neutral-400">
            {#if album.artists === 'Various Artists'}
                <span>Various Artists</span>
            {:else}
                {#each album.artists as artist, index}
                    <a class="hover:underline focus:underline" href="/details/artist?id={artist.id}&connection={album.connection.id}">{artist.name}</a>
                    {#if index < album.artists.length - 1}
                        &#44&#160
                    {/if}
                {/each}
            {/if}
        </div>
    </div>
</div>

<style>
    #thumbnail-wrapper:hover > #thumbnail {
        filter: brightness(40%);
    }
    #thumbnail-wrapper:hover > #play-button {
        opacity: 100%;
    }
    #thumbnail {
        transition: filter 150ms ease;
    }
    #play-button {
        transition: opacity 150ms ease;
    }
</style>
