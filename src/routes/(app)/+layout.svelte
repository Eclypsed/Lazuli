<script lang="ts">
    import MediaPlayer from '$lib/components/media/mediaPlayer.svelte'
    import Navbar from '$lib/components/util/navbar.svelte'
    import Sidebar from '$lib/components/util/sidebar.svelte'
    import { queue } from '$lib/stores'

    // I'm thinking I might want to make /albums, /artists, and /playlists all there own routes and just wrap them in a (library) layout
    let sidebar: Sidebar

    $: currentlyPlaying = $queue.current
    $: shuffled = $queue.isShuffled
</script>

<main id="grid-wrapper" class="h-full">
    <Navbar on:opensidebar={sidebar.open} />
    <Sidebar bind:this={sidebar} />
    <section id="content-wrapper" class="overflow-y-scroll no-scrollbar">
        <slot />
    </section>
    {#if currentlyPlaying}
        <MediaPlayer
            mediaItem={currentlyPlaying}
            {shuffled}
            mediaSession={'mediaSession' in navigator ? navigator.mediaSession : null}
            on:stop={() => $queue.clear()}
            on:next={() => $queue.next()}
            on:previous={() => $queue.previous()}
            on:toggleShuffle={() => $queue.toggleShuffle()}
        />
    {/if}
</main>

<style>
    #grid-wrapper {
        display: grid;
        grid-template-rows: min-content auto;
    }
</style>
