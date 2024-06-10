<script lang="ts">
    import LazyImage from './lazyImage.svelte'

    export let mediaItem: Song | Album | Artist | Playlist

    const thumbnailUrl = 'thumbnailUrl' in mediaItem ? mediaItem.thumbnailUrl : mediaItem.profilePicture

    const date = 'releaseDate' in mediaItem && mediaItem.releaseDate ? new Date(mediaItem.releaseDate).getFullYear().toString() : 'releaseYear' in mediaItem ? mediaItem.releaseYear : undefined
</script>

<div id="list-item" class="h-16 w-full">
    <div class="h-full overflow-clip rounded-md">
        {#if thumbnailUrl}
            <LazyImage {thumbnailUrl} alt={`${mediaItem.name} thumbnial`} />
        {:else}
            <div id="thumbnail-placeholder" class="grid h-full w-full place-items-center bg-lazuli-primary">
                <i class="fa-solid {mediaItem.type === 'artist' ? 'fa-user' : 'fa-play'} text-2xl" />
            </div>
        {/if}
    </div>
    <div class="line-clamp-1">{mediaItem.name}</div>
    <span class="line-clamp-1 flex text-neutral-400">
        {#if 'artists' in mediaItem && mediaItem.artists}
            {#if mediaItem.artists === 'Various Artists'}
                <span>Various Artists</span>
            {:else}
                {#each mediaItem.artists as artist, index}
                    <a class="hover:underline focus:underline" href="/details/artist?id={artist.id}&connection={mediaItem.connection.id}">{artist.name}</a>
                    {#if index < mediaItem.artists.length - 1}
                        &#44&#160
                    {/if}
                {/each}
            {/if}
        {:else if 'uploader' in mediaItem && mediaItem.uploader}
            <span>{mediaItem.uploader.name}</span>
        {:else if 'createdBy' in mediaItem && mediaItem.createdBy}
            <span>{mediaItem.createdBy.name}</span>
        {/if}
    </span>
    <div class="justify-self-center text-neutral-400">{date ?? ''}</div>
</div>

<style>
    #list-item {
        display: grid;
        column-gap: 1rem;
        align-items: center;
        grid-template-columns: 4rem 1fr 1fr 5rem;
    }
    #thumbnail-placeholder {
        background: radial-gradient(circle, rgba(0, 0, 0, 0) 25%, rgba(35, 40, 50, 1) 100%);
    }
</style>
