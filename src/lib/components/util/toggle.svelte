<script lang="ts">
    export let toggled = false

    import { createEventDispatcher } from 'svelte'
    const dispatch = createEventDispatcher()

    const handleToggle = (): void => {
        toggled = !toggled
        dispatch('toggled', { toggled })
    }
</script>

<button class:toggled aria-checked={toggled} role="checkbox" class="relative flex h-6 w-10 items-center rounded-full bg-neutral-500 transition-colors" on:click={handleToggle}>
    <div class:toggled class="absolute left-0 aspect-square h-full p-1 transition-all">
        <div class="grid h-full w-full place-items-center rounded-full bg-white text-xs">
            <i class={toggled ? 'fa-solid fa-check text-lazuli-primary' : 'fa-solid fa-xmark text-neutral-500'} />
        </div>
    </div>
</button>

<style>
    button.toggled {
        background-color: var(--lazuli-primary);
    }
    div.toggled {
        left: 100%;
        transform: translateX(-100%);
    }
</style>
