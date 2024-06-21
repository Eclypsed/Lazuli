<!--
    @component
    A component to easily display the artists of a track or album, or the user associated with either a Song, Album, or Playlist
    object. Formatting of the text such as font size, weight, and line clamps can be specified in a wrapper element.

    @param mediaItem Either a Song, Album, or Playlist object.
    @param linked Boolean. If true artists will be linked with anchor tags. Defaults to true.
-->

<script lang="ts">
    export let mediaItem: Song | Album | Playlist
    export let linked = true
</script>

<div class="break-words break-keep">
    {#if 'artists' in mediaItem && mediaItem.artists && typeof mediaItem.artists === 'string'}
        {mediaItem.artists}
    {:else if 'artists' in mediaItem && mediaItem.artists && typeof mediaItem.artists !== 'string' && mediaItem.artists.length > 0}
        {#each mediaItem.artists as artist, index}
            {@const needsComma = index < mediaItem.artists.length - 1}
            {#if linked}
                <a class:needsComma class="hover:underline focus:underline" href="/details/artist?id={artist.id}&connection={mediaItem.connection.id}">{artist.name}</a>
            {:else}
                <span class:needsComma class="artist-name">{artist.name}</span>
            {/if}
        {/each}
    {:else if 'uploader' in mediaItem && mediaItem.uploader}
        {#if linked}
            <a class="hover:underline focus:underline" href="/details/user?id={mediaItem.uploader.id}&connection={mediaItem.connection.id}">{mediaItem.uploader.name}</a>
        {:else}
            <span>{mediaItem.uploader.name}</span>
        {/if}
    {:else if 'createdBy' in mediaItem && mediaItem.createdBy}
        {#if linked}
            <a class="hover:underline focus:underline" href="/details/user?id={mediaItem.createdBy.id}&connection={mediaItem.connection.id}">{mediaItem.createdBy.name}</a>
        {:else}
            <span>{mediaItem.createdBy.name}</span>
        {/if}
    {/if}
</div>

<style>
    .needsComma::after {
        content: ',';
        margin-right: 0.25em;
    }
</style>
