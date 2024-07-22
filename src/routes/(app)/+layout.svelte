<script lang="ts">
    import MediaPlayer from '$lib/components/media/mediaPlayer.svelte'
    import Navbar from '$lib/components/util/navbar.svelte'
    import Sidebar from '$lib/components/util/sidebar.svelte'
    import { queue } from '$lib/stores'

    // I'm thinking I might want to make /albums, /artists, and /playlists all there own routes and just wrap them in a (library) layout
    let sidebar: Sidebar

    $: currentlyPlaying = $queue.current
    $: shuffled = $queue.isShuffled

    let playerWidth: number
</script>

<main id="grid-wrapper" class="relative h-full">
    <Navbar on:opensidebar={sidebar.open} />
    <Sidebar bind:this={sidebar} />
    <section id="content-wrapper" class="overflow-y-scroll no-scrollbar">
        <div class="my-8">
            <slot />
        </div>
        {#if currentlyPlaying}
            <div bind:clientWidth={playerWidth} class="sticky {playerWidth > 800 ? 'bottom-0' : 'bottom-3 mx-3'} transition-all">
                <MediaPlayer
                    mediaItem={currentlyPlaying}
                    {shuffled}
                    mediaSession={'mediaSession' in navigator ? navigator.mediaSession : null}
                    --border-radius={playerWidth > 800 ? '0' : '0.5rem'}
                    on:stop={() => $queue.clear()}
                    on:next={() => $queue.next()}
                    on:previous={() => $queue.previous()}
                    on:toggleShuffle={() => $queue.toggleShuffle()}
                />
            </div>
        {/if}
    </section>
</main>

<style>
    #grid-wrapper {
        display: grid;
        grid-template-rows: min-content auto;
    }
    #content-wrapper {
        display: grid;
        grid-template-rows: auto min-content;
    }
</style>
