<script lang="ts">
    export let mediaItem: Song | Album | Artist | Playlist

    import IconButton from '$lib/components/util/iconButton.svelte'
    import { goto } from '$app/navigation'
    import { queue } from '$lib/stores'

    let queueRef = $queue // This nonsense is to prevent an bug that causes svelte to throw an error when setting a property of the queue directly

    let image: HTMLImageElement, captionText: HTMLDivElement

    async function setQueueItems(mediaItem: Album | Playlist) {
        const itemsResponse = await fetch(`/api/connections/${mediaItem.connection.id}/${mediaItem.type}/${mediaItem.id}/items`, {
            credentials: 'include',
        }).then((response) => response.json() as Promise<{ items: Song[] }>)

        const items = itemsResponse.items
        queueRef.setQueue({ songs: items })
    }
</script>

<div id="card-wrapper" class="flex-shrink-0">
    <button id="thumbnail" class="relative h-52 transition-all duration-200 ease-out" on:click={() => goto(`/details/${mediaItem.type}?id=${mediaItem.id}&connection=${mediaItem.connection.id}`)}>
        {#if 'thumbnailUrl' in mediaItem || 'profilePicture' in mediaItem}
            <img
                bind:this={image}
                id="card-image"
                on:load={() => (captionText.style.width = `${image.width}px`)}
                class="h-full rounded transition-all"
                src="/api/remoteImage?url={'thumbnailUrl' in mediaItem ? mediaItem.thumbnailUrl : mediaItem.profilePicture}"
                alt="{mediaItem.name} thumbnail"
            />
        {:else}
            <div id="card-image" class="grid aspect-square h-full place-items-center rounded-lg bg-lazuli-primary transition-all">
                <i class="fa-solid fa-compact-disc text-7xl" />
            </div>
        {/if}
        <span id="play-button" class="absolute left-1/2 top-1/2 h-12 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-200 ease-out">
            <IconButton
                halo={true}
                on:click={() => {
                    switch (mediaItem.type) {
                        case 'song':
                            queueRef.setQueue({ songs: [mediaItem] })
                            break
                        case 'album':
                        case 'playlist':
                            setQueueItems(mediaItem)
                            break
                    }
                }}
            >
                <i slot="icon" class="fa-solid fa-play text-xl" />
            </IconButton>
        </span>
    </button>
    <div bind:this={captionText} class="w-56 p-1">
        <div class="mb-0.5 line-clamp-2 text-wrap text-sm" title={mediaItem.name}>{mediaItem.name}</div>
        <div class="leading-2 line-clamp-2 flex flex-wrap text-neutral-400" style="font-size: 0;">
            {#if 'artists' in mediaItem && mediaItem.artists && mediaItem.artists.length > 0}
                {#if mediaItem.artists === 'Various Artists'}
                    <span class="text-sm">Various Artists</span>
                {:else}
                    {#each mediaItem.artists as artist, index}
                        <a class="text-sm hover:underline focus:underline" href="/details/artist?id={artist.id}&connection={mediaItem.connection.id}">{artist.name}</a>
                        {#if index < mediaItem.artists.length - 1}
                            <span class="mr-0.5 text-sm">,</span>
                        {/if}
                    {/each}
                {/if}
            {:else if 'uploader' in mediaItem && mediaItem.uploader}
                <a class="text-sm hover:underline focus:underline" href="/details/user?id={mediaItem.uploader.id}&connection={mediaItem.connection.id}">{mediaItem.uploader.name}</a>
            {:else if 'createdBy' in mediaItem && mediaItem.createdBy}
                <a class="text-sm hover:underline focus:underline" href="/details/user?id={mediaItem.createdBy.id}&connection={mediaItem.connection.id}">{mediaItem.createdBy.name}</a>
            {/if}
        </div>
    </div>
</div>

<style>
    #thumbnail:hover {
        scale: 1.05;
    }
    #thumbnail:hover #card-image {
        filter: brightness(50%);
    }
    #thumbnail:hover #play-button {
        opacity: 1;
    }
</style>
