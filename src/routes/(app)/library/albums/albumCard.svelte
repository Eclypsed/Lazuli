<script lang="ts">
    import LazyImage from '$lib/components/media/lazyImage.svelte'
    import IconButton from '$lib/components/util/iconButton.svelte'
    import ArtistList from '$lib/components/media/artistList.svelte'
    import Services from '$lib/services.json'
    import { goto } from '$app/navigation'
    import { queue, newestAlert } from '$lib/stores'

    export let album: Album

    async function playAlbum() {
        const itemsResponse = await fetch(`/api/connections/${album.connection.id}/album/${album.id}/items`, {
            credentials: 'include',
        }).catch(() => null)

        if (!itemsResponse || !itemsResponse.ok) {
            $newestAlert = ['warning', 'Failed to play album']
            return
        }

        const data = (await itemsResponse.json()) as { items: Song[] }
        $queue.setQueue(data.items)
    }
</script>

<div class="overflow-hidden p-3">
    <div id="thumbnail-wrapper" class="relative aspect-square w-full overflow-clip rounded">
        <button id="thumbnail" class="h-full w-full" on:click={() => goto(`/details/album?id=${album.id}&connection=${album.connection.id}`)}>
            <LazyImage thumbnailUrl={album.thumbnailUrl} alt={`${album.name} jacket`} objectFit={'cover'} />
        </button>
        <div id="play-button" class="absolute left-1/2 top-1/2 h-1/4 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity">
            <IconButton halo={true} on:click={playAlbum}>
                <i slot="icon" class="fa-solid fa-play text-2xl" />
            </IconButton>
        </div>
        <img id="connection-type-icon" class="absolute left-2 top-2 h-9 w-9 opacity-0 transition-opacity" src={Services[album.connection.type].icon} alt={Services[album.connection.type].displayName} />
    </div>
    <div class="py-2 text-center text-sm">
        <div class="line-clamp-2">{album.name}</div>
        <div class="line-clamp-2 text-neutral-400">
            <ArtistList mediaItem={album} />
        </div>
    </div>
</div>

<style>
    #thumbnail-wrapper:hover > #thumbnail {
        filter: brightness(35%);
    }
    #thumbnail-wrapper:hover > #play-button {
        opacity: 1;
    }
    /* #connection-type-icon {
        filter: grayscale();
    } */
    #thumbnail-wrapper:hover > #connection-type-icon {
        opacity: 1;
    }
    #thumbnail {
        transition: filter 150ms ease;
    }
</style>
