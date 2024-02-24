<script lang="ts">
    import Services from '$lib/services.json'
    import IconButton from '$lib/components/util/iconButton.svelte'
    import Toggle from '$lib/components/util/toggle.svelte'
    import type { SubmitFunction } from '@sveltejs/kit'
    import { fly } from 'svelte/transition'
    import { enhance } from '$app/forms'

    export let connection: Connection<serviceType>
    export let submitFunction: SubmitFunction

    $: serviceData = Services[connection.type]

    let showModal = false

    const subHeaderItems: string[] = []
    if ('username' in connection.service && connection.service.username) subHeaderItems.push(connection.service.username)
    if ('serverName' in connection.service && connection.service.serverName) subHeaderItems.push(connection.service.serverName)
</script>

<section class="rounded-lg" style="background-color: rgba(82, 82, 82, 0.25);" transition:fly={{ x: 50 }}>
    <header class="flex h-20 items-center gap-4 p-4">
        <div class="relative aspect-square h-full p-1">
            <img src={serviceData.icon} alt="{serviceData.displayName} icon" />
            {#if 'profilePicture' in connection.service && connection.service.profilePicture}
                <img src={connection.service.profilePicture} alt="" class="absolute bottom-0 right-0 aspect-square h-5 rounded-full" />
            {/if}
        </div>
        <div>
            <div>{serviceData.displayName}</div>
            <div class="text-sm text-neutral-500">
                {subHeaderItems.join(' - ')}
            </div>
        </div>
        <div class="relative ml-auto flex h-8 flex-row-reverse gap-2">
            <IconButton halo={true} on:click={() => (showModal = !showModal)}>
                <i slot="icon" class="fa-solid fa-ellipsis-vertical text-xl text-neutral-500" />
            </IconButton>
            {#if showModal}
                <form use:enhance={submitFunction} method="post" class="absolute right-0 top-full flex flex-col items-center justify-center gap-1 rounded-md bg-neutral-900 p-2 text-xs">
                    <button formaction="?/deleteConnection" class="whitespace-nowrap rounded-md px-3 py-2 hover:bg-neutral-800">
                        <i class="fa-solid fa-link-slash mr-1" />
                        Delete Connection
                    </button>
                    <input type="hidden" value={connection.id} name="connectionId" />
                </form>
            {/if}
        </div>
    </header>
    <hr class="mx-2 border-t-2 border-neutral-600" />
    <div class="p-4 text-sm text-neutral-400">
        <div class="grid grid-cols-[3rem_auto] gap-4">
            <Toggle on:toggled={(event) => console.log(event.detail.toggled)} />
            <span>Place for config</span>
        </div>
    </div>
</section>
