<script>
    export let currentPage

    import Navbar from '$lib/components/utility/navbar.svelte'
    import { fly } from 'svelte/transition'

    const contentTabs = {
        Home: '/',
        Artists: '/artist',
        Playlists: '/playlist',
        Libray: '/library',
    }

    let previousPage = currentPage
    let direction = 1
    $: calculateDirection(currentPage)

    const calculateDirection = (newPage) => {
        const contentLinks = Object.values(contentTabs)
        const newPageIndex = contentLinks.indexOf(newPage)
        const previousPageIndex = contentLinks.indexOf(previousPage)
        if (newPageIndex > previousPageIndex) {
            direction = 1
        } else {
            direction = -1
        }
        previousPage = currentPage
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
                setTimeout(() => (indicatorBar.style.left = `${tabRec.left - listRect.left}px`), 350)
            } else {
                indicatorBar.style.left = `${tabRec.left - listRect.left}px`
                setTimeout(() => (indicatorBar.style.right = `${listRect.right - tabRec.right}px`), 350)
            }
        }
    }
</script>

{#if Object.values(contentTabs).includes(currentPage)}
    <Navbar />
    <div class="flex justify-center py-4">
        <h1 bind:this={tabList} class="relative flex justify-center gap-12 text-lg">
            {#each Object.entries(contentTabs) as [header, page]}
                {#if currentPage === page}
                    <span bind:this={activeTab} class="pointer-events-none">{header}</span>
                {:else}
                    <a class="text-neutral-400 hover:text-lazuli-primary" href={page}>{header}</a>
                {/if}
            {/each}
            <div bind:this={indicatorBar} class="absolute h-0.5 bg-lazuli-primary transition-all duration-300 ease-in-out" />
        </h1>
    </div>
    <div class="overflow-x-hidden px-8 sm:px-32">
        {#key previousPage}
            <div in:fly={{ x: 200 * direction, duration: 300, delay: 300 }} out:fly={{ x: -200 * direction, duration: 300 }}>
                <slot name="innerContent" />
            </div>
        {/key}
    </div>
{:else}
    <slot name="innerContent" />
{/if}
