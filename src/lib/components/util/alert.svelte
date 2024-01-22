<script lang="ts">
    export let alertType: AlertType
    export let alertMessage: string
    import { onMount, createEventDispatcher } from 'svelte'
    import { slide, fly } from 'svelte/transition'

    let show: boolean = false
    const dispatch = createEventDispatcher<{ closeAlert: null }>()

    type BgColors = {
        [key in AlertType]: string
    }

    const bgColors: BgColors = {
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
    <div in:fly={{ x: 500 }} out:slide={{ axis: 'y' }} class="py-1">
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
