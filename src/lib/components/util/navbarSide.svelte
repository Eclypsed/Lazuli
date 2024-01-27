<script context="module" lang="ts">
    export interface NavTab {
        pathname: string
        name: string
        icon: string
    }
</script>

<script lang="ts">
    export let navTabs: NavTab[]
    export let currentPathname: string
    export let transitionTime: number = 200

    import { fade } from 'svelte/transition'
    import { createEventDispatcher } from 'svelte'

    const dispatch = createEventDispatcher()

    type PageTransitionDirection = 'up' | 'down'
    let direction: PageTransitionDirection = 'down'

    const calculateDirection = (newPage: string, currentPage: string): PageTransitionDirection => {
        const newPageIndex = navTabs.findIndex((tab) => tab.pathname === newPage)
        const currentPageIndex = navTabs.findIndex((tab) => tab.pathname === currentPage)
        return newPageIndex > currentPageIndex ? 'down' : 'up'
    }

    let activeTab: HTMLButtonElement, indicatorBar: HTMLDivElement, tabList: HTMLDivElement
    $: calculateBar(activeTab)

    const calculateBar = (activeTab: HTMLButtonElement) => {
        if (activeTab && indicatorBar && tabList) {
            const listRect = tabList.getBoundingClientRect()
            const tabRec = activeTab.getBoundingClientRect()
            if (direction === 'down') {
                indicatorBar.style.bottom = `${listRect.bottom - tabRec.bottom}px`
                setTimeout(() => (indicatorBar.style.top = `${tabRec.top - listRect.top}px`), transitionTime)
            } else {
                indicatorBar.style.top = `${tabRec.top - listRect.top}px`
                setTimeout(() => (indicatorBar.style.bottom = `${listRect.bottom - tabRec.bottom}px`), transitionTime)
            }
        }
    }
</script>

<div class="relative flex h-full flex-col gap-6 rounded-lg px-3 py-12" bind:this={tabList}>
    {#each navTabs as tabData}
        {#if currentPathname === tabData.pathname}
            <button bind:this={activeTab} class="pointer-events-none grid aspect-square w-14 place-items-center text-white transition-colors" disabled>
                <span class="flex flex-col gap-2 text-xs">
                    <i class="{tabData.icon} text-xl" />
                    {tabData.name}
                </span>
            </button>
        {:else}
            <button
                class="grid aspect-square w-14 place-items-center text-neutral-400 transition-colors hover:text-lazuli-primary"
                on:click={() => {
                    direction = calculateDirection(tabData.pathname, currentPathname)
                    dispatch('navigate', { direction, pathname: tabData.pathname })
                }}
            >
                <span class="flex flex-col gap-2 text-xs">
                    <i class="{tabData.icon} text-xl" />
                    {tabData.name}
                </span>
            </button>
        {/if}
    {/each}
    {#if navTabs.some((tab) => tab.pathname === currentPathname)}
        <div bind:this={indicatorBar} transition:fade class="absolute left-0 w-[0.2rem] rounded-full bg-white transition-all duration-300 ease-in-out" />
    {/if}
</div>
