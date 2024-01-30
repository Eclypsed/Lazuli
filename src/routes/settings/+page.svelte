<script lang="ts">
    import IconButton from '$lib/components/util/iconButton.svelte'
    import { goto } from '$app/navigation'
    import type { LayoutServerData } from '../$types.js'

    export let data: LayoutServerData

    interface SettingRoute {
        pathname: string
        displayName: string
        icon: string
    }

    const settingRoutes: SettingRoute[] = [
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

<nav class="h-full rounded-lg bg-neutral-950 p-6">
    <h1 class="flex h-6 justify-between text-neutral-400">
        <span>
            <i class="fa-solid fa-gear" />
            Settings
        </span>
        {#if data.url.pathname.split('/').at(-1) !== 'settings'}
            <IconButton on:click={() => goto('/settings')}>
                <i slot="icon" class="fa-solid fa-caret-left" />
            </IconButton>
        {/if}
    </h1>
    <ol class="ml-2 mt-4 flex flex-col gap-3 border-2 border-transparent border-l-neutral-500 px-2">
        {#each settingRoutes as route}
            <li>
                {#if data.url.pathname === route.pathname}
                    <div class="rounded-lg bg-neutral-500 px-3 py-1">
                        <i class={route.icon} />
                        {route.displayName}
                    </div>
                {:else}
                    <a href={route.pathname} class="block rounded-lg px-3 py-1 opacity-50 hover:bg-neutral-700">
                        <i class={route.icon} />
                        {route.displayName}
                    </a>
                {/if}
            </li>
        {/each}
    </ol>
</nav>
