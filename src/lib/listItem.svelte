<script>
    export let item

    import { generateURL } from '$lib/Jellyfin-api.js'
    import { ticksToTime } from '$lib/utils.js'
    import { createEventDispatcher } from 'svelte'

    $: jacketSrc = generateURL({ type: 'Image', pathParams: { id: 'Primary' in item.ImageTags ? item.Id : item.AlbumId } })

    const dispatch = createEventDispatcher()

    const startPlaybackDispatcher = () => {
        dispatch('startPlayback', {
            item: item,
        })
    }
</script>

<button on:click={startPlaybackDispatcher} class="grid w-full grid-cols-[1em_50px_auto_3em] items-center gap-3 bg-[#1111116b] p-3 text-left font-notoSans text-neutral-300 transition-[width] duration-100 hover:w-[102%]">
    <div class="justify-self-center">{item.IndexNumber}</div>
    <img class="justify-self-center" src={jacketSrc} alt="" draggable="false" />
    <div class="justify-items-left">
        <div class="line-clamp-2">{item.Name}</div>
        <div class="mt-[.15rem] text-neutral-500">{item.Artists.join(', ')}</div>
    </div>
    <span class="text-right">{ticksToTime(item.RunTimeTicks)}</span>
</button>
