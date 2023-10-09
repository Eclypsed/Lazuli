<script>
    import { onMount } from 'svelte';

    import { fetchSong } from '$lib/Jellyfin-api.js'

    export let data;

    let fetchedData = {};

    onMount(async () => {
        fetchedData = await fetchSong(data.id);
    });
</script>

<div>
    { #await fetchedData}
        <p>Loading</p>
    {:then songData}
        <p>{songData.Name}</p>
    {/await}
</div>

<style>

</style>