<script lang="ts">
    import Loader from '$lib/components/util/loader.svelte'
    import type { PageData } from './$types'

    export let data: PageData
</script>

<main>
    {#await data.playlistDetails}
        <Loader />
    {:then [playlist, items]}
        <section class="flex gap-8">
            <img class="h-60" src="/api/remoteImage?url={playlist.thumbnailUrl}" alt="{playlist.name} cover art" />
            <div>
                <div class="text-4xl">{playlist.name}</div>
            </div>
        </section>
        {#each items as item}
            <div>{item.name}</div>
        {/each}
    {:catch}
        <div>Failed to fetch playlist</div>
    {/await}
</main>
