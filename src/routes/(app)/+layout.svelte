<script>
    import Navbar from '$lib/components/utility/navbar.svelte'
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
        '/artist': {
            header: 'Artists',
            icon: 'fa-solid fa-guitar',
        },
        '/playlist': {
            header: 'Playlists',
            icon: 'fa-solid fa-bars-staggered',
        },
        '/library': {
            header: 'Libray',
            icon: 'fa-solid fa-book-open',
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
            const listRect = tabList.getBoundingClientRect()
            const tabRec = activeTab.getBoundingClientRect()
            indicatorBar.style.top = `${listRect.height}px`
            if (direction === 1) {
                indicatorBar.style.right = `${listRect.right - tabRec.right}px`
                setTimeout(() => (indicatorBar.style.left = `${tabRec.left - listRect.left}px`), pageTransitionTime)
            } else {
                indicatorBar.style.left = `${tabRec.left - listRect.left}px`
                setTimeout(() => (indicatorBar.style.right = `${listRect.right - tabRec.right}px`), pageTransitionTime)
            }
        }
    }
</script>

<div id="main-grid" class="h-full">
    <Navbar />
    <section id="content-grid" class="overflow-hidden">
        <section id="sidebar">
            {#if $pageWidth >= 768}
                <div class="mr-4 flex h-full flex-col gap-8 rounded-lg px-3 py-6">
                    {#each Object.entries(contentTabs) as [page, tabData]}
                        <button
                            class="{data.url === page ? 'pointer-events-none text-white' : 'text-neutral-400 hover:text-lazuli-primary'} aspect-square w-14 transition-colors"
                            disabled={data.url === page}
                            on:click={() => goto(page)}
                        >
                            <i class="{tabData.icon} text-xl" />
                            <span class="text-xs">{tabData.header}</span>
                        </button>
                    {/each}
                    <!-- {#if data.url in contentTabs}
                            <div bind:this={indicatorBar} transition:fade class="absolute h-0.5 bg-lazuli-primary transition-all duration-300 ease-in-out" />
                        {/if} -->
                </div>
            {/if}
        </section>
        {#key previousPage}
            <section
                id="page"
                in:fly={{ x: 200 * direction, duration: pageTransitionTime, delay: pageTransitionTime }}
                out:fly={{ x: -200 * direction, duration: pageTransitionTime }}
                class="no-scrollbar h-full overflow-y-scroll px-[5vw] pt-4 md:pl-[0rem]"
            >
                <slot />
            </section>
        {/key}
    </section>
    <footer class="fixed bottom-0 flex w-full flex-col items-center justify-center">
        <MiniPlayer displayMode={$pageWidth > 768 ? 'horizontal' : 'vertical'} />
        {#if $pageWidth < 768}
            <h1 id="tabList" class="relative flex w-full items-center justify-around bg-black">
                {#each Object.entries(contentTabs) as [page, tabData]}
                    <button class="{data.url === page ? 'pointer-events-none text-white' : 'text-neutral-400 hover:text-lazuli-primary'} transition-colors" disabled={data.url === page} on:click={() => goto(page)}>
                        <i class={tabData.icon} />
                    </button>
                {/each}
            </h1>
        {/if}
    </footer>
</div>

<style>
    #content-grid {
        display: grid;
        grid-template-columns: max-content auto;
        grid-template-rows: 100%;
    }
    #main-grid {
        display: grid;
        grid-template-rows: max-content auto;
        grid-template-columns: 100%;
    }
    #tabList {
        padding: 16px 0px;
        font-size: 20px;
        line-height: 28px;
    }
</style>
