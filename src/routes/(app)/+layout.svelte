<script lang="ts">
    import { fly } from 'svelte/transition'
    import { goto, beforeNavigate } from '$app/navigation'
    import { pageWidth } from '$lib/stores'
    import type { LayoutData } from './$types'
    import { onMount } from 'svelte'
    import NavTabComponent, { type NavTab } from '$lib/components/navbar/navTab.svelte'
    import PlaylistTabComponent, { type PlaylistTab } from '$lib/components/navbar/playlistTab.svelte'

    export let data: LayoutData

    const pageTransitionTime: number = 200

    let currentTabIndex = -1

    type PageTransitionDirection = 1 | -1
    let directionMultiplier: PageTransitionDirection = 1

    let indicatorBar: HTMLDivElement, tabList: HTMLDivElement

    const inPathnameHeirarchy = (pathname: string, rootPathname: string): boolean => {
        return (pathname.startsWith(rootPathname) && rootPathname !== '/') || (pathname === '/' && rootPathname === '/')
    }

    // const calculateDirection = (newTab: Tab): void => {
    //     const newTabIndex = data.tabs.findIndex((tab) => tab === newTab)
    //     directionMultiplier = newTabIndex > currentTabIndex ? -1 : 1
    //     currentTabIndex = newTabIndex
    // }

    // const navigate = (newPathname: string): void => {
    //     const newTabIndex = data.tabs.findIndex((tab) => inPathnameHeirarchy(newPathname, tab.pathname))

    //     if (newTabIndex < 0) indicatorBar.style.opacity = '0'

    //     const newTab = data.tabs[newTabIndex]
    //     if (!newTab?.button) return

    //     const tabRec = newTab.button.getBoundingClientRect(),
    //         listRect = tabList.getBoundingClientRect()

    //     const shiftTop = () => (indicatorBar.style.top = `${tabRec.top - listRect.top}px`),
    //         shiftBottom = () => (indicatorBar.style.bottom = `${listRect.bottom - tabRec.bottom}px`)

    //     if (directionMultiplier > 0) {
    //         shiftTop()
    //         setTimeout(shiftBottom, pageTransitionTime)
    //     } else {
    //         shiftBottom()
    //         setTimeout(shiftTop, pageTransitionTime)
    //     }

    //     setTimeout(() => (indicatorBar.style.opacity = '100%'), pageTransitionTime + 300)
    // }

    // onMount(() => setTimeout(() => navigate(data.url.pathname))) // More stupid fucking non-blocking event loop shit
    // beforeNavigate(({ to }) => {
    //     if (to) navigate(to.url.pathname)
    // })
</script>

{#if $pageWidth >= 768}
    <div class="grid h-full grid-rows-1 gap-8 overflow-hidden">
        <div class="no-scrollbar fixed left-0 top-0 z-10 grid h-full grid-cols-1 grid-rows-[min-content_auto] gap-6 p-3 pt-12 w-20" bind:this={tabList}>
            <div class="flex flex-col gap-6">
                {#each data.navTabs as nav}
                    <NavTabComponent {nav} disabled={inPathnameHeirarchy(data.url.pathname, nav.pathname)}/>
                {/each}
                <!-- <div bind:this={indicatorBar} class="absolute left-0 w-[0.2rem] rounded-full bg-white transition-all duration-300 ease-in-out" /> -->
            </div>
            <div class="flex flex-col gap-6">
                {#each data.playlistTabs as playlist}
                    <PlaylistTabComponent {playlist} disabled={new URLSearchParams(data.url.search).get('playlist') === playlist.id} />
                {/each}
            </div>
        </div>
        <section class="no-scrollbar relative overflow-y-scroll">
            {#key data.url}
                <div
                    in:fly={{ y: -50 * directionMultiplier, duration: pageTransitionTime, delay: pageTransitionTime }}
                    out:fly={{ y: 50 * directionMultiplier, duration: pageTransitionTime }}
                    class="absolute w-full px-[clamp(7rem,_5vw,_24rem)] pt-16"
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