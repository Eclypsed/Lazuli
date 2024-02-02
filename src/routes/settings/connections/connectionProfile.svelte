<script lang="ts">
    import Services from '$lib/services.json'
    import IconButton from '$lib/components/util/iconButton.svelte'
    import Toggle from '$lib/components/util/toggle.svelte'
    import type { SubmitFunction } from '@sveltejs/kit'
    import { fly } from 'svelte/transition'
    import { enhance } from '$app/forms'

    export let connection: Connection
    export let submitFunction: SubmitFunction

    const serviceData = Services[connection.service.type]

    let showUnlinkModal = false
</script>

<section class="overflow-hidden rounded-lg" style="background-color: rgba(82, 82, 82, 0.25);" transition:fly={{ x: 50 }}>
    <header class="flex h-20 items-center gap-4 p-4">
        <img src={serviceData.icon} alt="{serviceData.displayName} icon" class="aspect-square h-full p-1" />
        <div>
            <div>{'username' in connection.service ? connection.service.username : 'Placeholder Account Name'}</div>
            <div class="text-sm text-neutral-500">
                {serviceData.displayName}
                {#if 'serverName' in connection.service}
                    - {connection.service.serverName}
                {/if}
            </div>
        </div>
        <div class="relative ml-auto h-8">
            <IconButton halo={true} on:click={() => (showUnlinkModal = !showUnlinkModal)}>
                <i slot="icon" class="fa-solid fa-link-slash" />
            </IconButton>
            {#if showUnlinkModal}
                <form use:enhance={submitFunction} action="?/deleteConnection" method="post" class="absolute right-full top-0 flex -translate-x-3 flex-col items-center justify-center gap-3 rounded-md bg-neutral-925 p-4">
                    <span class="whitespace-nowrap">Delete Connection</span>
                    <div class="flex gap-4">
                        <button class="w-20 rounded-md bg-red-500 px-2 py-1">Confirm</button>
                        <button class="w-20 rounded-md bg-neutral-600 px-2 py-1" on:click|preventDefault={() => (showUnlinkModal = false)}>Cancel</button>
                    </div>
                    <input type="hidden" value={connection.id} name="connectionId" />
                </form>
            {/if}
        </div>
    </header>
    <hr class="mx-2 border-t-2 border-neutral-600" />
    <div class="p-4 text-sm text-neutral-400">
        <div class="grid grid-cols-[3rem_auto] gap-4">
            <Toggle on:toggled={(event) => console.log(event.detail.toggled)} />
            <span>Enable Connection</span>
        </div>
    </div>
</section>
