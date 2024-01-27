<script lang="ts">
    import { fly } from 'svelte/transition'
    import { goto } from '$app/navigation'
    import { pageWidth } from '$lib/stores'
    import NavbarSide, { type NavTab } from '$lib/components/util/navbarSide.svelte'
    import NavbarFoot from '$lib/components/util/navbarFoot.svelte'
    import { page } from '$app/stores'

    let currentPathname = $page.url.pathname

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
    let directionMultiplier: PageTransitionDirection = 1
</script>

{#if $pageWidth >= 768}
    <div id="content-grid" class="grid h-full grid-rows-1 gap-8 overflow-hidden">
        <NavbarSide
            navTabs={contentTabs}
            {currentPathname}
            transitionTime={pageTransitionTime}
            on:navigate={(event) => {
                event.detail.direction === 'up' ? (directionMultiplier = 1) : (directionMultiplier = -1)
                currentPathname = event.detail.pathname
                goto(currentPathname)
            }}
        />
        <section class="no-scrollbar relative overflow-y-scroll">
            {#key currentPathname}
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
        {#key currentPathname}
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
            <NavbarFoot
                navTabs={contentTabs}
                {currentPathname}
                transitionTime={pageTransitionTime}
                on:navigate={(event) => {
                    event.detail.direction === 'right' ? (directionMultiplier = 1) : (directionMultiplier = -1)
                    currentPathname = event.detail.pathname
                    goto(currentPathname)
                }}
            />
        </footer>
    </div>
{/if}

<style>
    #content-grid {
        grid-template-columns: max-content auto;
    }
</style>
