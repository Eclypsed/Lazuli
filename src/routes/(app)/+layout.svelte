<script>
    import MiniPlayer from '$lib/components/media/miniPlayer.svelte'
    import { fly, fade } from 'svelte/transition'
    import { goto } from '$app/navigation'
    import { pageWidth } from '$lib/utils/stores.js'

    export let data

    const contentTabs = {
        '/': {
            header: 'Home',
            icon: 'fa-solid fa-house',
        },
        '/library': {
            header: 'Libray',
            icon: 'fa-solid fa-bars-staggered',
        },
        '/search': {
            header: 'Search',
            icon: 'fa-solid fa-search',
        },
    }

    const pageTransitionTime = 200

    let previousPage = data.url
    let direction = 1
    $: calculateDirection(data.url)

    const calculateDirection = (newPage) => {
        const contentLinks = Object.keys(contentTabs)
        const newPageIndex = contentLinks.indexOf(newPage)
        const previousPageIndex = contentLinks.indexOf(previousPage)
        if (newPageIndex > previousPageIndex) {
            direction = 1
        } else {
            direction = -1
        }
        previousPage = data.url
    }

    let activeTab, indicatorBar, tabList
    $: calculateBar(activeTab)

    const calculateBar = (activeTab) => {
        if (activeTab && indicatorBar && tabList) {
            if ($pageWidth >= 768) {
                const listRect = tabList.getBoundingClientRect()
                const tabRec = activeTab.getBoundingClientRect()
                if (direction === 1) {
                    indicatorBar.style.bottom = `${listRect.bottom - tabRec.bottom}px`
                    setTimeout(() => (indicatorBar.style.top = `${tabRec.top - listRect.top}px`), pageTransitionTime)
                } else {
                    indicatorBar.style.top = `${tabRec.top - listRect.top}px`
                    setTimeout(() => (indicatorBar.style.bottom = `${listRect.bottom - tabRec.bottom}px`), pageTransitionTime)
                }
            } else {
                const listRect = tabList.getBoundingClientRect()
                const tabRec = activeTab.getBoundingClientRect()
                if (direction === 1) {
                    indicatorBar.style.right = `${listRect.right - tabRec.right}px`
                    setTimeout(() => (indicatorBar.style.left = `${tabRec.left - listRect.left}px`), pageTransitionTime)
                } else {
                    indicatorBar.style.left = `${tabRec.left - listRect.left}px`
                    setTimeout(() => (indicatorBar.style.right = `${listRect.right - tabRec.right}px`), pageTransitionTime)
                }
            }
        }
    }
</script>

{#if $pageWidth >= 768}
    <div id="content-grid" class="h-full overflow-hidden">
        <section class="relative mr-4 flex h-full flex-col gap-6 rounded-lg px-3 py-6" bind:this={tabList}>
            {#each Object.entries(contentTabs) as [page, tabData]}
                {#if data.url === page}
                    <button bind:this={activeTab} class="pointer-events-none aspect-square w-14 text-white transition-colors" disabled="true">
                        <i class="{tabData.icon} text-xl" />
                        <span class="text-xs">{tabData.header}</span>
                    </button>
                {:else}
                    <button class="aspect-square w-14 text-neutral-400 transition-colors hover:text-lazuli-primary" on:click={() => goto(page)}>
                        <i class="{tabData.icon} text-xl" />
                        <span class="text-xs">{tabData.header}</span>
                    </button>
                {/if}
            {/each}
            {#if data.url in contentTabs}
                <div bind:this={indicatorBar} transition:fade class="absolute left-0 w-[0.2rem] rounded-full bg-white transition-all duration-300 ease-in-out" />
            {/if}
        </section>
        <section class="no-scrollbar relative overflow-y-scroll">
            {#key previousPage}
                <div in:fly={{ y: -50 * direction, duration: pageTransitionTime, delay: pageTransitionTime }} out:fly={{ y: 50 * direction, duration: pageTransitionTime }} class="absolute w-full pr-[5vw] pt-16">
                    <slot />
                </div>
            {/key}
        </section>
        <footer class="fixed bottom-0 flex w-full flex-col items-center justify-center">
            <MiniPlayer displayMode={'horizontal'} />
        </footer>
    </div>
{:else}
    <div class="h-full overflow-hidden">
        {#key previousPage}
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
                {#each Object.entries(contentTabs) as [page, tabData]}
                    {#if data.url === page}
                        <button bind:this={activeTab} class="pointer-events-none text-white transition-colors" disabled="true">
                            <i class={tabData.icon} />
                        </button>
                    {:else}
                        <button class="text-neutral-400 transition-colors hover:text-lazuli-primary" on:click={() => goto(page)}>
                            <i class={tabData.icon} />
                        </button>
                    {/if}
                {/each}
                {#if data.url in contentTabs}
                    <div bind:this={indicatorBar} transition:fade class="absolute bottom-0 h-1 rounded-full bg-white transition-all duration-300 ease-in-out" />
                {/if}
            </div>
        </footer>
    </div>
{/if}

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
