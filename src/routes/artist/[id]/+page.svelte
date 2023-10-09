<script>
    import { onMount } from 'svelte';

    import { fetchArtistItems } from '$lib/Jellyfin-api.js';
    import AlbumCard from '$lib/albumCard.svelte';
    export let data;

    let artistItems = {
        albums: [],
        singles: [],
        appearances: []
    };
    onMount(async () => {
        artistItems = await fetchArtistItems(data.id);
    })
</script>

<div class="grid">
    { #each artistItems.albums as item }
        <AlbumCard {item} cardType="albums"/>
    { /each }
</div>
<div class="grid">
    { #each artistItems.singles as item }
        <AlbumCard {item} cardType="singles"/>
    { /each }
</div>
<div class="grid">
    { #each artistItems.appearances as item }
        <AlbumCard  {item} cardType="appearances"/>
    { /each }
</div>

<style>
    .grid {
        display: grid;
        grid-template-columns: repeat(9, 200px);
    }
</style>