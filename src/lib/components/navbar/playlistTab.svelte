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
</script>

<div class="flex items-center gap-1">
    <button
        title={playlist.name}
        {disabled}
        class="relative aspect-square w-full rounded-lg bg-cover bg-center transition-all"
        style="background-image: url({playlist.thumbnail});"
        on:click={() => {
            dispatch('click')
            goto(`/library?playlist=${playlist.id}}`)
        }}
    >
    </button>
    <span class="translate-x-3 overflow-clip text-ellipsis whitespace-nowrap rounded-md bg-slate-600 px-2 py-1 text-sm">{playlist.name}</span>
</div>

<style>
    button:not(:disabled):not(:hover) {
        filter: brightness(50%);
    }
</style>