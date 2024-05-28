<script lang="ts">
    import Loader from '$lib/components/util/loader.svelte'
    import type { PageData } from './$types'

    export let data: PageData
</script>

<main>
    {#await data.albumDetails}
        <Loader />
    {:then [album, items]}
        <section class="flex gap-8">
            <img class="h-60" src="/api/remoteImage?url={album.thumbnailUrl}" alt="{album.name} cover art" />
            <div>
                <div class="text-4xl">{album.name}</div>
                {#if album.artists === 'Various Artists'}
                    <div>Various Artists</div>
                {:else}
                    <div style="font-size: 0;">
                        {#each album.artists as artist, index}
                            <a class="text-sm hover:underline focus:underline" href="/details/artist?id={artist.id}&connection={album.connection.id}">{artist.name}</a>
                            {#if index < album.artists.length - 1}
                                <span class="mr-0.5 text-sm">,</span>
                            {/if}
                        {/each}
                    </div>
                {/if}
            </div>
        </section>
        {#each items as item}
            <div>{item.name}</div>
        {/each}
    {/await}
</main>
