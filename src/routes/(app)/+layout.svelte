<script>
    import Navbar from '$lib/components/utility/navbar.svelte'
    import Footer from '$lib/components/utility/footer.svelte'
    import MiniPlayer from '$lib/components/media/miniPlayer.svelte'
    import { fly, fade } from 'svelte/transition'
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
        if (activeTab) {
            const listRect = tabList.getBoundingClientRect()
            const tabRec = activeTab.getBoundingClientRect()
            indicatorBar.style.top = `${listRect.height}px`
            if (direction === 1) {
                indicatorBar.style.right = `${listRect.right - tabRec.right}px`
                setTimeout(() => (indicatorBar.style.left = `${tabRec.left - listRect.left}px`), 300)
            } else {
                indicatorBar.style.left = `${tabRec.left - listRect.left}px`
                setTimeout(() => (indicatorBar.style.right = `${listRect.right - tabRec.right}px`), 300)
            }
        }
    }
</script>

<div class="flex h-full flex-col">
    {#if $pageWidth > 768}
        <Navbar>
            <h1 slot="center-content" bind:this={tabList} class="relative flex items-center gap-12 text-lg">
                {#each Object.entries(contentTabs) as [page, tabData]}
                    {#if data.url === page}
                        <span bind:this={activeTab} class="pointer-events-none">{tabData.header}</span>
                    {:else}
                        <a class="text-neutral-400 hover:text-lazuli-primary" href={page}>{tabData.header}</a>
                    {/if}
                {/each}
                {#if data.url in contentTabs}
                    <div bind:this={indicatorBar} transition:fade class="absolute h-0.5 bg-lazuli-primary transition-all duration-300 ease-in-out" />
                {/if}
            </h1>
        </Navbar>
    {:else}
        <Navbar />
    {/if}
    <div class="relative flex-1 overflow-hidden">
        {#key previousPage}
            <div in:fly={{ x: 200 * direction, duration: 300, delay: 300 }} out:fly={{ x: -200 * direction, duration: 300 }} class="no-scrollbar h-full overflow-y-scroll px-8 py-4 md:px-32">
                <slot />
            </div>
        {/key}
        <div class="absolute bottom-0 w-full">
            <MiniPlayer displayMode={$pageWidth > 768 ? 'horizontal' : 'vertical'} />
        </div>
    </div>
    {#if $pageWidth < 768}
        <Footer>
            <section slot="content" class="flex items-center justify-center" style="height: 32px;">
                <h1 bind:this={tabList} class="relative flex w-full items-center justify-around">
                    {#each Object.entries(contentTabs) as [page, tabData]}
                        {#if data.url === page}
                            <span bind:this={activeTab} class="pointer-events-none"><i class={tabData.icon} /></span>
                        {:else}
                            <a class="text-neutral-400 hover:text-lazuli-primary" href={page}><i class={tabData.icon} /></a>
                        {/if}
                    {/each}
                    {#if data.url in contentTabs}
                        <div bind:this={indicatorBar} transition:fade class="absolute h-0.5 bg-lazuli-primary transition-all duration-300 ease-in-out" />
                    {/if}
                </h1>
            </section>
        </Footer>
    {/if}
</div>
