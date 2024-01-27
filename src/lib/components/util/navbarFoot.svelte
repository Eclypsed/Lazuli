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

    type PageTransitionDirection = 'left' | 'right'
    let direction: PageTransitionDirection = 'right'

    const calculateDirection = (newPage: string, currentPage: string): PageTransitionDirection => {
        const newPageIndex = navTabs.findIndex((tab) => tab.pathname === newPage)
        const currentPageIndex = navTabs.findIndex((tab) => tab.pathname === currentPage)
        return newPageIndex > currentPageIndex ? 'right' : 'left'
    }

    let activeTab: HTMLButtonElement, indicatorBar: HTMLDivElement, tabList: HTMLDivElement
    $: calculateBar(activeTab)

    const calculateBar = (activeTab: HTMLButtonElement) => {
        if (activeTab && indicatorBar && tabList) {
            const listRect = tabList.getBoundingClientRect()
            const tabRec = activeTab.getBoundingClientRect()
            if (direction === 'right') {
                indicatorBar.style.right = `${listRect.right - tabRec.right}px`
                setTimeout(() => (indicatorBar.style.left = `${tabRec.left - listRect.left}px`), transitionTime)
            } else {
                indicatorBar.style.left = `${tabRec.left - listRect.left}px`
                setTimeout(() => (indicatorBar.style.right = `${listRect.right - tabRec.right}px`), transitionTime)
            }
        }
    }
</script>

<div bind:this={tabList} id="bottom-tab-list" class="relative flex w-full items-center justify-around bg-black">
    {#each navTabs as tabData}
        {#if currentPathname === tabData.pathname}
            <button bind:this={activeTab} class="pointer-events-none text-white transition-colors" disabled>
                <i class={tabData.icon} />
            </button>
        {:else}
            <button
                class="text-neutral-400 transition-colors hover:text-lazuli-primary"
                on:click={() => {
                    direction = calculateDirection(tabData.pathname, currentPathname)
                    dispatch('navigate', { direction, pathname: tabData.pathname })
                }}
            >
                <i class={tabData.icon} />
            </button>
        {/if}
    {/each}
    {#if navTabs.some((tab) => tab.pathname === currentPathname)}
        <div bind:this={indicatorBar} transition:fade class="absolute bottom-0 h-1 rounded-full bg-white transition-all duration-300 ease-in-out" />
    {/if}
</div>

<style>
    #bottom-tab-list {
        padding: 16px 0px;
        font-size: 20px;
        line-height: 28px;
    }
</style>
