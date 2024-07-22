<script lang="ts">
    import AutoImage from './autoImage.svelte'
    import IconButton from '$lib/components/util/iconButton.svelte'
    import ArtistList from '$lib/components/media/artistList.svelte'
    import { goto } from '$app/navigation'
    import { queue, newestAlert } from '$lib/stores'
    import { apiV1 } from '$lib/api-helper'
    import ServiceLogo from '$lib/components/util/serviceLogo.svelte'

    export let playlist: Playlist

    async function playPlaylist() {
        try {
            const initialResponse = await apiV1.get(`connections/${playlist.connection.id}/playlist/${playlist.id}/items?startIndex=0&limit=50`).json<{ items: Song[] }>()
            $queue.setQueue(initialResponse.items)

            if (initialResponse.items.length < 50) return

            const remainderResponse = await apiV1.get(`connections/${playlist.connection.id}/playlist/${playlist.id}/items?startIndex=50`).json<{ items: Song[] }>()
            $queue.enqueue(...remainderResponse.items)
        } catch {
            $newestAlert = ['warning', 'Failed to play playlist']
        }
    }
</script>

<div class="overflow-hidden">
    <div id="thumbnail-wrapper" class="relative aspect-square w-full overflow-clip rounded">
        <button id="thumbnail" class="h-full w-full" on:click={() => goto(`/details/playlist?id=${playlist.id}&connection=${playlist.connection.id}`)}>
            <AutoImage thumbnailUrl={playlist.thumbnailUrl} alt="{playlist.name} jacket" --object-fit="cover" --height="100%" --border-radius="0.25rem" />
        </button>
        <div id="play-button" class="absolute left-1/2 top-1/2 h-1/4 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity">
            <IconButton halo={true} on:click={playPlaylist}>
                <i slot="icon" class="fa-solid fa-play text-2xl" />
            </IconButton>
        </div>
        <div id="connection-type-icon" class="absolute left-2 top-2 h-6 w-6 opacity-0 transition-opacity">
            <ServiceLogo type={playlist.connection.type} />
        </div>
    </div>
    <div class="py-2 text-center text-sm">
        <div class="line-clamp-2">{playlist.name}</div>
        <div class="line-clamp-2 text-neutral-400">
            <ArtistList mediaItem={playlist} />
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
    #thumbnail-wrapper:hover > #connection-type-icon {
        opacity: 1;
    }
    #thumbnail {
        transition: filter 150ms ease;
    }
</style>
