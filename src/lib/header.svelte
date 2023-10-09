<script>
    export let header;
    export let artists;
    export let year;
    export let length;

    import { ticksToTime } from '$lib/utils.js';
</script>

<div class="text-white flex flex-col items-baseline font-notoSans gap-2">
    <span class="text-[3rem] leading-[4rem] line-clamp-2">{header}</span>
    <div id="details" class="flex text-xl text-neutral-300">
        {#if length}
        <span>{ticksToTime(length)}</span>
        {/if}
        <span class="flex">
            {#if artists}
            {#each artists as artist}
            <a class="no-underline hover:underline" href="/artist/{artist.Id}">{artist.Name}</a>
            {#if artists.indexOf(artist) !== artists.length - 1}<span class="mx-2">/</span>{/if}
            {/each}
            {/if}
        </span>
        {#if year}
        <span>{year}</span>
        {/if}
    </div>
</div>

<style>
    #details > span:not(:last-child)::after {
        content: "•";
        margin: 0 .75rem;
    }
</style>