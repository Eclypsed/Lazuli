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

    import { createEventDispatcher } from "svelte";
    import { goto } from "$app/navigation";

    const dispatch = createEventDispatcher()
</script>

<button
    class="grid aspect-square w-full place-items-center transition-colors"
    {disabled}
    on:click={() => {
        dispatch('click')
        goto(nav.pathname)
    }}
>
    <span class="pointer-events-none flex flex-col gap-2 text-xs">
        <i class="{nav.icon} text-xl" />
        {nav.name}
    </span>
</button>

<style>
    button:not(:disabled) {
        color: rgb(163 163, 163);
    }
    button:not(:disabled):hover {
        color: var(--lazuli-primary);
    }
</style>