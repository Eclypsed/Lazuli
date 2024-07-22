<script lang="ts">
    import { slide, fade } from 'svelte/transition'
    import { sineOut } from 'svelte/easing'
    import { goto } from '$app/navigation'
    import IconButton from './iconButton.svelte'
    import PhPlaylistBold from '~icons/ph/playlist-bold'
    import MaterialSymbolsHome from '~icons/material-symbols/home'
    import IcSharpVideoLibrary from '~icons/ic/sharp-video-library'

    type NavButton = {
        name: string
        path: string
        icon: any
    }

    const navButtons: NavButton[] = [
        { name: 'Home', path: '/', icon: MaterialSymbolsHome },
        { name: 'Mixes', path: '/mixes', icon: PhPlaylistBold },
        { name: 'Library', path: '/library', icon: IcSharpVideoLibrary },
    ]

    const OPEN_CLOSE_DURATION = 250

    export function open() {
        isOpen = true
    }

    export function close() {
        isOpen = false
    }

    let isOpen: boolean = false
</script>

{#if isOpen}
    <div class="fixed isolate z-50">
        <div transition:fade={{ duration: OPEN_CLOSE_DURATION }} aria-hidden="true" class="fixed bottom-0 left-0 right-0 top-0" style="background-color: rgba(0,0,0,0.3);" />
        <section id="sidebar-wrapper" class="fixed bottom-0 left-0 right-0 top-0">
            <div transition:slide={{ duration: OPEN_CLOSE_DURATION, axis: 'x', easing: sineOut }} class="relative h-full w-full overflow-clip bg-neutral-950 py-4 text-neutral-300 shadow-2xl">
                {#each navButtons as tab}
                    <button
                        on:click={() => {
                            goto(tab.path)
                            close()
                        }}
                        class="flex w-full items-center gap-6 px-10 py-3.5 text-left transition-colors hover:bg-[rgba(255,255,255,0.1)]"
                    >
                        <svelte:component this={tab.icon} class="text-lg" />
                        {tab.name}
                    </button>
                {/each}
                <div class="absolute bottom-3 right-3 aspect-square h-10">
                    <IconButton on:click={close}>
                        <i slot="icon" class="fa-solid fa-arrow-left" />
                    </IconButton>
                </div>
            </div>
            <div aria-hidden="true" on:click={close} class="h-full w-full" />
        </section>
    </div>
{/if}

<style>
    #sidebar-wrapper {
        display: grid;
        grid-template-columns: minmax(auto, 20rem) minmax(4rem, auto);
    }
</style>
