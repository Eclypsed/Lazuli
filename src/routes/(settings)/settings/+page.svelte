<script>
    import IconButton from '$lib/components/utility/iconButton.svelte'
    import { goto } from '$app/navigation'

    export let data

    const settingRoutes = {
        connections: {
            displayName: 'Connections',
            uri: '/settings/connections',
            icon: 'fa-solid fa-circle-nodes',
        },
        // devices: {
        //     displayName: 'Devices',
        //     uri: '/settings/devices',
        //     icon: 'fa-solid fa-mobile-screen',
        // },
    }
</script>

<nav class="h-full rounded-lg bg-neutral-950 p-6">
    <h1 class="flex h-6 justify-between text-neutral-400">
        <span>
            <i class="fa-solid fa-gear" />
            Settings
        </span>
        {#if data.url.split('/').at(-1) !== 'settings'}
            <IconButton on:click={() => goto('/settings')}>
                <i slot="icon" class="fa-solid fa-caret-left" />
            </IconButton>
        {/if}
    </h1>
    <ol class="ml-2 mt-4 flex flex-col gap-3 border-2 border-transparent border-l-neutral-500 px-2">
        {#each Object.values(settingRoutes) as route}
            <li>
                {#if data.url === route.uri}
                    <div class="rounded-lg bg-neutral-500 px-3 py-1">
                        <i class={route.icon} />
                        {route.displayName}
                    </div>
                {:else}
                    <a href={route.uri} class="block rounded-lg px-3 py-1 opacity-50 hover:bg-neutral-700">
                        <i class={route.icon} />
                        {route.displayName}
                    </a>
                {/if}
            </li>
        {/each}
    </ol>
</nav>
