<script lang="ts">
    import SearchBar from '$lib/components/util/searchBar.svelte'
    import type { LayoutData } from './$types'
    import NavTab from '$lib/components/navbar/navTab.svelte'
    import PlaylistTab from '$lib/components/navbar/playlistTab.svelte'
    import MediaPlayer from '$lib/components/media/mediaPlayer.svelte'

    export let data: LayoutData

    const inPathnameHeirarchy = (pathname: string, rootPathname: string): boolean => {
        return (pathname.startsWith(rootPathname) && rootPathname !== '/') || (pathname === '/' && rootPathname === '/')
    }
    let playlistTooltip: HTMLDivElement

    const setTooltip = (x: number, y: number, content: string): void => {
        const textWrapper = playlistTooltip.firstChild! as HTMLDivElement
        textWrapper.innerText = content
        playlistTooltip.style.display = 'block'
        playlistTooltip.style.left = `${x}px`
        playlistTooltip.style.top = `${y}px`
    }
</script>

<div class="h-full overflow-hidden">
    <div class="no-scrollbar fixed left-0 top-0 z-10 grid h-full w-20 grid-cols-1 grid-rows-[min-content_auto] gap-5 px-3 py-12">
        <div class="flex flex-col gap-4">
            {#each data.navTabs as nav}
                <NavTab {nav} disabled={inPathnameHeirarchy(data.url.pathname, nav.pathname)} />
            {/each}
        </div>
        <div class="no-scrollbar flex flex-col gap-5 overflow-y-scroll px-1.5">
            {#each data.playlistTabs as playlist}
                <PlaylistTab {playlist} on:mouseenter={(event) => setTooltip(event.detail.x, event.detail.y, event.detail.content)} on:mouseleave={() => (playlistTooltip.style.display = 'none')} />
            {/each}
        </div>
        <div bind:this={playlistTooltip} class="absolute hidden max-w-48 -translate-y-1/2 translate-x-10 whitespace-nowrap rounded bg-neutral-800 px-2 py-1.5 text-sm">
            <div class="overflow-clip text-ellipsis">PLAYLIST_NAME</div>
            <div class="overflow-clip text-ellipsis text-neutral-400">Playlist &bull; {data.user.username}</div>
        </div>
    </div>
    <section class="no-scrollbar h-full overflow-y-scroll px-[max(7rem,_7vw)]">
        <div class="sticky top-0 max-w-xl py-6">
            <SearchBar />
        </div>
        <slot />
    </section>
    <section class="absolute bottom-0 z-40 grid max-h-full w-full place-items-center">
        <MediaPlayer />
    </section>
</div>
