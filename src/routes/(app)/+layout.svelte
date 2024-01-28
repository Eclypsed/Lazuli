<script lang="ts">
    import { fly } from 'svelte/transition'
    import { goto, beforeNavigate } from '$app/navigation'
    import { pageWidth } from '$lib/stores'
    import type { LayoutData } from './$types'
    import type { Tab } from './+layout'
    import { onMount } from 'svelte'

    export let data: LayoutData

    const pageTransitionTime: number = 200

    let currentTabIndex = -1

    type PageTransitionDirection = 1 | -1
    let directionMultiplier: PageTransitionDirection = 1

    let indicatorBar: HTMLDivElement, tabList: HTMLDivElement

    const inPathnameHeirarchy = (pathname: string, rootPathname: string): boolean => {
        return (pathname.startsWith(rootPathname) && rootPathname !== '/') || (pathname === '/' && rootPathname === '/')
    }

    const calculateDirection = (newTab: Tab): void => {
        const newTabIndex = data.tabs.findIndex((tab) => tab === newTab)
        directionMultiplier = newTabIndex > currentTabIndex ? -1 : 1
        currentTabIndex = newTabIndex
    }

    const navigate = (newPathname: string): void => {
        const newTabIndex = data.tabs.findIndex((tab) => inPathnameHeirarchy(newPathname, tab.pathname))

        if (newTabIndex < 0) indicatorBar.style.opacity = '0'

        const newTab = data.tabs[newTabIndex]
        if (!newTab?.button) return

        const tabRec = newTab.button.getBoundingClientRect(),
            listRect = tabList.getBoundingClientRect()

        const shiftTop = () => (indicatorBar.style.top = `${tabRec.top - listRect.top}px`),
            shiftBottom = () => (indicatorBar.style.bottom = `${listRect.bottom - tabRec.bottom}px`)

        if (directionMultiplier > 0) {
            shiftTop()
            setTimeout(shiftBottom, pageTransitionTime)
        } else {
            shiftBottom()
            setTimeout(shiftTop, pageTransitionTime)
        }

        setTimeout(() => (indicatorBar.style.opacity = '100%'), pageTransitionTime + 300)
    }

    onMount(() => setTimeout(() => navigate(data.url.pathname))) // More stupid fucking non-blocking event loop shit
    beforeNavigate(({ to }) => {
        if (to) navigate(to.url.pathname)
    })
</script>

{#if $pageWidth >= 768}
    <div id="content-grid" class="grid h-full grid-rows-1 gap-8 overflow-hidden">
        <div id="sidebar" class="relative grid h-full grid-cols-1 gap-6 overflow-clip p-3 pt-12" bind:this={tabList}>
            {#each data.tabs.filter((tab) => tab.type === 'nav') as nav, index}
                <button
                    class="navTab grid aspect-square w-14 place-items-center transition-colors"
                    bind:this={data.tabs[index].button}
                    disabled={inPathnameHeirarchy(data.url.pathname, nav.pathname)}
                    on:click={() => {
                        calculateDirection(nav)
                        goto(nav.pathname)
                    }}
                >
                    <span class="pointer-events-none flex flex-col gap-2 text-xs">
                        <i class="{nav.icon} text-xl" />
                        {nav.name}
                    </span>
                </button>
            {/each}
            <section class="no-scrollbar flex flex-col gap-4 overflow-y-scroll px-1">
                {#each data.tabs.filter((tab) => tab.type === 'playlist') as playlist}
                    <button
                        title={playlist.name}
                        disabled={new URLSearchParams(data.url.search).get('playlist') === new URLSearchParams(playlist.pathname.split('?')[1]).get('playlist')}
                        class="playlistTab aspect-square w-full rounded-lg border-white bg-cover bg-center transition-all"
                        style="background-image: url({playlist.icon});"
                        on:click={() => {
                            calculateDirection(playlist)
                            goto(playlist.pathname)
                        }}
                    ></button>
                {/each}
            </section>
            <div bind:this={indicatorBar} class="absolute left-0 w-[0.2rem] rounded-full bg-white transition-all duration-300 ease-in-out" />
        </div>
        <section class="no-scrollbar relative overflow-y-scroll">
            {#key data.url}
                <div
                    in:fly={{ y: -50 * directionMultiplier, duration: pageTransitionTime, delay: pageTransitionTime }}
                    out:fly={{ y: 50 * directionMultiplier, duration: pageTransitionTime }}
                    class="absolute w-full pr-[5vw] pt-16"
                >
                    <slot />
                </div>
            {/key}
        </section>
        <footer class="fixed bottom-0 flex w-full flex-col items-center justify-center">
            <!-- <MiniPlayer displayMode={'horizontal'} /> -->
        </footer>
    </div>
{:else}
    <div class="h-full overflow-hidden">
        {#key data.url.pathname}
            <section
                in:fly={{ x: 200 * directionMultiplier, duration: pageTransitionTime, delay: pageTransitionTime }}
                out:fly={{ x: -200 * directionMultiplier, duration: pageTransitionTime }}
                class="no-scrollbar h-full overflow-y-scroll px-[5vw] pt-16"
            >
                <slot />
            </section>
        {/key}
        <footer class="fixed bottom-0 flex w-full flex-col items-center justify-center">
            <!-- <MiniPlayer displayMode={'vertical'} /> -->
            <!-- <NavbarFoot
                {currentPathname}
                transitionTime={pageTransitionTime}
                on:navigate={(event) => {
                    event.detail.direction === 'right' ? (directionMultiplier = 1) : (directionMultiplier = -1)
                    currentPathname = event.detail.pathname
                    goto(currentPathname)
                }}
            /> -->
        </footer>
    </div>
{/if}

<style>
    #content-grid {
        grid-template-columns: max-content auto;
    }
    #sidebar {
        grid-template-rows: repeat(4, min-content) auto;
    }
    .navTab:not(:disabled) {
        color: rgb(163 163, 163);
    }
    .navTab:not(:disabled):hover {
        color: var(--lazuli-primary);
    }
    .playlistTab:not(:disabled):not(:hover) {
        filter: brightness(50%);
    }
</style>
