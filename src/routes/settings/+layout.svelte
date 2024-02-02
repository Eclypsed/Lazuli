<script lang="ts">
    import IconButton from '$lib/components/util/iconButton.svelte'
    import { goto } from '$app/navigation';
    import type { LayoutServerData } from '../$types'

    export let data: LayoutServerData

    interface SettingRoute {
        pathname: string
        displayName: string
        icon: string
    }

    const accountRoutes: SettingRoute[] = [
        {
            pathname: '/settings/connections',
            displayName: 'Connections',
            icon: 'fa-solid fa-circle-nodes',
        },
        {
            pathname: '/settings/devices',
            displayName: 'Devices',
            icon: 'fa-solid fa-mobile-screen',
        },
    ]
</script>

<main class="grid h-full grid-rows-[min-content_auto] pb-12">
    <h1 class="sticky top-0 grid grid-cols-[1fr_auto_1fr] grid-rows-1 items-center p-6 text-2xl">
        <span class="h-12">
            <IconButton on:click={() => goto('/user')}>
                <i slot="icon" class="fa-solid fa-arrow-left" />
            </IconButton>
        </span>
        <span>Settings</span>
    </h1>
    <section class="grid grid-cols-[min-content_auto] grid-rows-1 gap-8 px-[5vw]">
        <nav class="h-full">
            <a class="whitespace-nowrap text-lg {data.url.pathname === '/settings' ? 'text-lazuli-primary' : 'text-neutral-400 hover:text-lazuli-primary'}" href="/settings">
                <i class="fa-solid fa-user mr-1 w-4 text-center" />
                Account
            </a>
            <ol class="ml-2 mt-4 flex flex-col gap-3 border-2 border-transparent border-l-neutral-500 px-2">
                {#each accountRoutes as route}
                    {@const isActive = route.pathname === data.url.pathname}
                    <li class="w-60 px-3 py-1">
                        <a class="whitespace-nowrap {isActive ? 'text-lazuli-primary' : 'text-neutral-400 hover:text-lazuli-primary'}" href={route.pathname}>
                            <i class="{route.icon} mr-1 w-4 text-center" />
                            {route.displayName}
                        </a>
                    </li>
                {/each}
            </ol>
        </nav>
        <slot />
    </section>
</main>
