<script lang="ts">
    import { fly, fade } from 'svelte/transition'
    import { goto } from '$app/navigation'
    import { pageWidth } from '$lib/stores'
    import type { LayoutServerData } from '../$types'
    import NavbarSide, { type NavTab } from '$lib/components/util/navbarSide.svelte'

    export let data: LayoutServerData

    const contentTabs: NavTab[] = [
        {
            pathname: '/',
            name: 'Home',
            icon: 'fa-solid fa-house',
        },
        {
            pathname: '/user',
            name: 'User',
            icon: 'fa-solid fa-user', // This would be a cool spot for a user-uploaded pfp
        },
        {
            pathname: '/search',
            name: 'Search',
            icon: 'fa-solid fa-search',
        },
        {
            pathname: '/library',
            name: 'Libray',
            icon: 'fa-solid fa-bars-staggered',
        },
    ]

    const pageTransitionTime: number = 200

    type PageTransitionDirection = 1 | -1
    let direction: PageTransitionDirection = 1
    // $: calculateDirection(data.urlPathname)

    // const calculateDirection = (newPage: string): void => {
    //     const newPageIndex = contentTabs.findIndex((tab) => tab.pathname === newPage)
    //     const previousPageIndex = contentTabs.findIndex((tab) => tab.pathname === previousPage)
    //     newPageIndex > previousPageIndex ? (direction = 1) : (direction = -1)
    //     previousPage = data.urlPathname
    // }

    // let activeTab: HTMLButtonElement, indicatorBar: HTMLDivElement, tabList: HTMLDivElement
    // $: calculateBar(activeTab)

    // const calculateBar = (activeTab: HTMLButtonElement) => {
    //     if (activeTab && indicatorBar && tabList) {
    //         if ($pageWidth >= 768) {
    //             const listRect = tabList.getBoundingClientRect()
    //             const tabRec = activeTab.getBoundingClientRect()
    //             if (direction === 1) {
    //                 indicatorBar.style.bottom = `${listRect.bottom - tabRec.bottom}px`
    //                 setTimeout(() => (indicatorBar.style.top = `${tabRec.top - listRect.top}px`), pageTransitionTime)
    //             } else {
    //                 indicatorBar.style.top = `${tabRec.top - listRect.top}px`
    //                 setTimeout(() => (indicatorBar.style.bottom = `${listRect.bottom - tabRec.bottom}px`), pageTransitionTime)
    //             }
    //         } else {
    //             const listRect = tabList.getBoundingClientRect()
    //             const tabRec = activeTab.getBoundingClientRect()
    //             if (direction === 1) {
    //                 indicatorBar.style.right = `${listRect.right - tabRec.right}px`
    //                 setTimeout(() => (indicatorBar.style.left = `${tabRec.left - listRect.left}px`), pageTransitionTime)
    //             } else {
    //                 indicatorBar.style.left = `${tabRec.left - listRect.left}px`
    //                 setTimeout(() => (indicatorBar.style.right = `${listRect.right - tabRec.right}px`), pageTransitionTime)
    //             }
    //         }
    //     }
    // }
</script>

<!-- {#if $pageWidth >= 768} -->
<div id="content-grid" class="h-full overflow-hidden">
    <NavbarSide
        navTabs={contentTabs}
        currentPathname={data.urlPathname}
        transitionTime={pageTransitionTime}
        on:navigate={(event) => {
            event.detail.direction === 'up' ? (direction = 1) : (direction = -1)
            goto(event.detail.pathname)
        }}
    />
    <section class="no-scrollbar relative overflow-y-scroll">
        {#key data.urlPathname}
            <div in:fly={{ y: -50 * direction, duration: pageTransitionTime, delay: pageTransitionTime }} out:fly={{ y: 50 * direction, duration: pageTransitionTime }} class="absolute w-full pr-[5vw] pt-16">
                <slot />
            </div>
        {/key}
    </section>
    <footer class="fixed bottom-0 flex w-full flex-col items-center justify-center">
        <!-- <MiniPlayer displayMode={'horizontal'} /> -->
    </footer>
</div>

<!-- {:else}
    <div class="h-full overflow-hidden">
        {#key data.urlPathname}
            <section
                in:fly={{ x: 200 * direction, duration: pageTransitionTime, delay: pageTransitionTime }}
                out:fly={{ x: -200 * direction, duration: pageTransitionTime }}
                class="no-scrollbar h-full overflow-y-scroll px-[5vw] pt-16"
            >
                <slot />
            </section>
        {/key}
        <footer class="fixed bottom-0 flex w-full flex-col items-center justify-center">
            <MiniPlayer displayMode={'vertical'} />
            <div bind:this={tabList} id="bottom-tab-list" class="relative flex w-full items-center justify-around bg-black">
                {#each contentTabs as tabData}
                    {#if data.urlPathname === tabData.pathname}
                        <button bind:this={activeTab} class="pointer-events-none text-white transition-colors" disabled>
                            <i class={tabData.icon} />
                        </button>
                    {:else}
                        <button class="text-neutral-400 transition-colors hover:text-lazuli-primary" on:click={() => goto(tabData.pathname)}>
                            <i class={tabData.icon} />
                        </button>
                    {/if}
                {/each}
                {#if contentTabs.some((tab) => tab.pathname === data.urlPathname)}
                    <div bind:this={indicatorBar} transition:fade class="absolute bottom-0 h-1 rounded-full bg-white transition-all duration-300 ease-in-out" />
                {/if}
            </div>
        </footer>
    </div>
{/if} -->

<style>
    #content-grid {
        display: grid;
        grid-template-columns: max-content auto;
        grid-template-rows: 100%;
    }
    #bottom-tab-list {
        padding: 16px 0px;
        font-size: 20px;
        line-height: 28px;
    }
</style>
