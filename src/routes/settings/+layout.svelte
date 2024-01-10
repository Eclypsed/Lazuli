<script>
    import IconButton from '$lib/components/utility/iconButton.svelte'
    import { goto } from '$app/navigation'
    import { page } from '$app/stores'

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

<main class="mx-auto grid h-full max-w-screen-xl gap-8 p-8 pt-24">
    <nav class="h-full rounded-lg p-6">
        <h1 class="flex h-6 justify-between text-neutral-400">
            <span>
                <i class="fa-solid fa-gear" />
                Settings
            </span>
            {#if $page.url.pathname.split('/').at(-1) !== 'settings'}
                <IconButton on:click={() => goto('/settings')}>
                    <i slot="icon" class="fa-solid fa-caret-left" />
                </IconButton>
            {/if}
        </h1>
        <ol class="ml-2 mt-4 flex flex-col gap-3 border-2 border-transparent border-l-neutral-500 px-2">
            {#each Object.values(settingRoutes) as route}
                <li>
                    {#if $page.url.pathname === route.uri}
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
    <div class="relative h-full overflow-y-scroll rounded-lg">
        <slot />
    </div>
</main>

<style>
    main {
        grid-template-columns: 20rem auto;
    }
    nav {
        background-color: rgba(82, 82, 82, 0.25);
    }
    i {
        text-align: center;
        width: 1rem;
        margin-right: 0.2rem;
    }
</style>
