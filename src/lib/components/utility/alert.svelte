<script>
    export let alertType
    export let alertMessage
    import { onMount } from 'svelte'
    import { slide } from 'svelte/transition'
    import { fly } from 'svelte/transition'
    import { createEventDispatcher } from 'svelte'

    let show = false
    const dispatch = createEventDispatcher()

    const bgColors = {
        info: 'bg-neutral-500',
        success: 'bg-emerald-500',
        caution: 'bg-amber-500',
        warning: 'bg-red-500',
    }

    export const triggerClose = () => {
        show = false
        dispatch('closeAlert')
    }

    onMount(() => {
        show = true
        setTimeout(() => triggerClose(), 10000)
    })
</script>

{#if show}
    <div in:fly={{ duration: 300, x: 500 }} out:slide={{ duration: 300, axis: 'y' }} class="py-1">
        <div class="flex gap-1 overflow-hidden rounded-md">
            <div class="flex w-full items-center p-4 {bgColors[alertType]}">
                {alertMessage}
            </div>
            <button class="w-16 {bgColors[alertType]}" on:click={() => triggerClose()}>
                <i class="fa-solid fa-x" />
            </button>
        </div>
    </div>
{/if}
