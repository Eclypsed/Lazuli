<script>
    import { fly, slide } from 'svelte/transition'
    import { cubicIn, cubicOut } from 'svelte/easing'

    import { generateURL } from '$lib/Jellyfin-api.js'
    import AlbumBg from '$lib/albumBG.svelte'
    import Navbar from '$lib/navbar.svelte'
    import ListItem from '$lib/listItem.svelte'
    import Header from '$lib/header.svelte'
    import MediaPlayer from '$lib/mediaPlayer.svelte'

    export let data
    let albumImg = generateURL({ type: 'Image', pathParams: { id: data.id } })
    // console.log(generateURL({type: 'Items', queryParams: {'albumIds': data.albumData.Id, 'recursive': true}}))
    let discArray = Array.from({ length: data.albumData?.discCount ? data.albumData.discCount : 1 }, (_, i) => {
        return data.albumItemsData.filter((item) => item?.ParentIndexNumber === i + 1 || !item?.ParentIndexNumber)
    })
    let mediaPlayerOpen = false
    let currentMediaPlayerItem

    const playSong = (event) => {
        currentMediaPlayerItem = event.detail.item
        mediaPlayerOpen = true
    }
</script>

<div id="main" class="flex h-screen flex-col" in:fly={{ easing: cubicOut, y: 10, duration: 1000, delay: 400 }} out:fly={{ easing: cubicIn, y: -10, duration: 500 }}>
    <AlbumBg {albumImg} />
    <Navbar />
    <div id="layout" class="no-scrollbar relative m-[0_auto] grid w-full max-w-[92vw] grid-cols-1 gap-0 overflow-y-scroll pt-8 md:grid-cols-[1fr_2fr] md:gap-[4%] md:pt-48">
        <img class="rounded object-cover" src={albumImg} alt="Jacket" draggable="false" />
        <div class="my-12 flex flex-col gap-4 pr-2">
            <Header header={data.albumData.name} artists={data.albumData.artists} year={data.albumData.year} length={data.albumData.length} />
            <div class="flex flex-col gap-4">
                {#each discArray as disc}
                    <div>
                        {#if data.albumData.discCount}
                            <span class="m-3 block font-notoSans text-lg text-neutral-300">DISC {discArray.indexOf(disc) + 1}</span>
                        {/if}
                        <div class="flex w-full flex-col items-center divide-y-[1px] divide-[#353535]">
                            {#each disc as song}
                                <ListItem item={song} on:startPlayback={playSong} />
                            {/each}
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </div>
    <div class="fixed bottom-0 z-20 w-full">
        {#if mediaPlayerOpen}
            <div transition:slide={{ duration: 400 }} class="h-screen">
                <MediaPlayer currentlyPlaying={currentMediaPlayerItem} playlistItems={data.albumItemsData} on:closeMediaPlayer={() => (mediaPlayerOpen = false)} on:startPlayback={playSong} />
            </div>
        {/if}
    </div>
</div>
