<script lang="ts" context="module">
    export interface PlaylistTab {
        id: string
        name: string
        thumbnail: string
    }
</script>

<script lang="ts">
    export let disabled = false
    export let playlist: PlaylistTab

    import { createEventDispatcher } from "svelte";
    import { goto } from "$app/navigation";

    const dispatch = createEventDispatcher()

    let button: HTMLButtonElement
</script>

<button
    {disabled}
    bind:this={button}
    class="relative aspect-square w-full rounded-lg bg-cover bg-center transition-all"
    style="background-image: url({playlist.thumbnail});"
    on:click={() => {
        dispatch('click')
        goto(`/library?playlist=${playlist.id}`)
    }}
>
    <span class="absolute left-full top-1/2 overflow-clip text-ellipsis whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-sm origin-left transition-transform duration-75">{playlist.name}</span>
</button>

<style>
    button:not(:disabled):not(:hover) {
        filter: brightness(50%);
    }
    span {
        transform: translateX(0.75rem) translateY(-50%) scale(0);
    }
    button:hover > span {
        transform: translateX(0.75rem) translateY(-50%) scale(100%);
    }
</style>