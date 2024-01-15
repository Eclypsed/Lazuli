<script>
    export let open = false

    import IconButton from './iconButton.svelte'
    import { slide } from 'svelte/transition'

    export const toggleOpen = () => (open = !open)

    let sidebar
</script>

<svelte:document
    on:mouseup={(event) => {
        if (sidebar && open) {
            if (!sidebar.contains(event.target)) open = false
        }
    }}
/>
{#if open}
    <section bind:this={sidebar} transition:slide={{ axis: 'x' }} class="fixed left-0 top-0 z-20 h-full w-full max-w-sm bg-slate-600 p-2" style="width: calc(100% - 4rem);">
        <div class="float-right h-8">
            <IconButton on:click={toggleOpen}>
                <i slot="icon" class="fa-solid fa-x" />
            </IconButton>
        </div>
    </section>
{/if}
