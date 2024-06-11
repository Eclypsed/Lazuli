<script lang="ts">
    import LazyImage from './lazyImage.svelte'
    import ArtistList from './artistList.svelte'

    export let mediaItem: Song | Album | Artist | Playlist

    const thumbnailUrl = 'thumbnailUrl' in mediaItem ? mediaItem.thumbnailUrl : mediaItem.profilePicture

    const date = 'releaseDate' in mediaItem && mediaItem.releaseDate ? new Date(mediaItem.releaseDate).getFullYear().toString() : 'releaseYear' in mediaItem ? mediaItem.releaseYear : undefined
</script>

<div id="list-item" class="h-16 w-full">
    <div class="h-full overflow-clip rounded-md">
        {#if thumbnailUrl}
            <LazyImage {thumbnailUrl} alt={`${mediaItem.name} thumbnial`} objectFit={'cover'} />
        {:else}
            <div id="thumbnail-placeholder" class="grid h-full w-full place-items-center bg-lazuli-primary">
                <i class="fa-solid {mediaItem.type === 'artist' ? 'fa-user' : 'fa-play'} text-2xl" />
            </div>
        {/if}
    </div>
    <div class="line-clamp-1">{mediaItem.name}</div>
    <span class="line-clamp-1 text-neutral-400">
        {#if mediaItem.type !== 'artist'}
            <ArtistList {mediaItem} />
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
