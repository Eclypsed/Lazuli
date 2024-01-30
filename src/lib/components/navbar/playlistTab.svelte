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

    import { createEventDispatcher } from 'svelte'
    import { goto } from '$app/navigation'

    const dispatch = createEventDispatcher()

    let button: HTMLButtonElement

    type ButtonCenter = {
        x: number
        y: number
    }

    const calculateCenter = (button: HTMLButtonElement): ButtonCenter => {
        const rect = button.getBoundingClientRect()
        const x = (rect.left + rect.right) / 2
        const y = (rect.top + rect.bottom) / 2
        return { x, y }
    }
</script>

<button
    {disabled}
    bind:this={button}
    class="relative aspect-square w-full rounded-lg bg-cover bg-center transition-all"
    style="background-image: url({playlist.thumbnail});"
    on:mouseenter={() => dispatch('mouseenter', { ...calculateCenter(button), content: playlist.name })}
    on:mouseleave={() => dispatch('mouseleave')}
    on:click={() => {
        dispatch('click')
        goto(`/library?playlist=${playlist.id}`)
    }}
>
</button>

<style>
    button:not(:disabled):not(:hover) {
        filter: brightness(50%);
    }
</style>
