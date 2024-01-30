<script lang="ts" context="module">
    export interface NavTab {
        pathname: string
        name: string
        icon: string
    }
</script>

<script lang="ts">
    export let disabled = false
    export let nav: NavTab

    import { createEventDispatcher } from 'svelte'
    import { goto } from '$app/navigation'

    const dispatch = createEventDispatcher()

    let button: HTMLButtonElement
</script>

<button bind:this={button} class="relative grid aspect-square w-full place-items-center transition-colors" {disabled} on:click={() => goto(nav.pathname)}>
    <span class="pointer-events-none flex flex-col gap-2 text-xs">
        <i class="{nav.icon} text-xl" />
        {nav.name}
    </span>
    <div class="absolute left-0 top-1/2 h-0 w-[0.2rem] -translate-x-2 -translate-y-1/2 rounded-lg bg-white transition-all" />
</button>

<style>
    button:disabled > div {
        height: 80%;
    }
    button:not(:disabled) {
        color: rgb(163 163, 163);
    }
    button:not(:disabled):hover {
        color: var(--lazuli-primary);
    }
    button:not(:disabled):hover > div {
        height: 40%;
    }
</style>
