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
    import { createEventDispatcher, onMount } from 'svelte'

    const dispatch = createEventDispatcher()

    type PageTransitionDirection = 'left' | 'right'
    let direction: PageTransitionDirection = 'right'

    const calculateDirection = (newPage: string, currentPage: string): PageTransitionDirection => {
        const newPageIndex = navTabs.findIndex((tab) => tab.pathname === newPage)
        const currentPageIndex = navTabs.findIndex((tab) => tab.pathname === currentPage)
        return newPageIndex > currentPageIndex ? 'right' : 'left'
    }

    let indicatorBar: HTMLDivElement, tabList: HTMLDivElement

    const calculateBar = (newPathname: string) => {
        const newTab = document.querySelector(`button[data-tab="${newPathname}"]`)
        if (newTab && indicatorBar && tabList) {
            const listRect = tabList.getBoundingClientRect(),
                tabRec = newTab.getBoundingClientRect()
            const shiftRight = () => (indicatorBar.style.right = `${listRect.right - tabRec.right}px`),
                shiftLeft = () => (indicatorBar.style.left = `${tabRec.left - listRect.left}px`)
            if (direction === 'right') {
                shiftRight()
                setTimeout(shiftLeft, transitionTime)
            } else {
                shiftLeft()
                setTimeout(shiftRight, transitionTime)
            }
        }
    }
</script>

<div bind:this={tabList} id="tab-list" class="relative flex w-full items-center justify-around bg-black">
    {#each navTabs as tabData}
        <button
            class="transition-colors"
            data-tab={tabData.pathname}
            disabled={currentPathname === tabData.pathname}
            on:click={() => {
                direction = calculateDirection(tabData.pathname, currentPathname)
                dispatch('navigate', { direction, pathname: tabData.pathname })
            }}
        >
            <i class="{tabData.icon} pointer-events-none" />
        </button>
    {/each}
    {#if navTabs.some((tab) => tab.pathname === currentPathname)}
        <div bind:this={indicatorBar} transition:fade class="absolute bottom-0 h-1 rounded-full bg-white transition-all duration-300 ease-in-out" />
    {/if}
</div>

<style>
    #tab-list {
        padding: 16px 0px;
        font-size: 20px;
        line-height: 28px;
    }
    button:not(:disabled) {
        cursor: pointer;
        color: rgb(163 163, 163);
    }
    button:not(:disabled):hover {
        color: var(--lazuli-primary);
    }
</style>
