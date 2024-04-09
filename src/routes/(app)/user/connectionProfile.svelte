<script lang="ts">
    import Services from '$lib/services.json'
    import Toggle from '$lib/components/util/toggle.svelte'
    import { fly } from 'svelte/transition'
    import type { SubmitFunction } from '@sveltejs/kit'
    import { enhance } from '$app/forms'

    export let connectionInfo: ConnectionInfo
    export let submitFunction: SubmitFunction

    $: serviceData = Services[connectionInfo.type]

    const subHeaderItems: string[] = []
    if ('username' in connectionInfo) {
        subHeaderItems.push(connectionInfo.username)
    }
    if ('serverName' in connectionInfo) {
        subHeaderItems.push(connectionInfo.serverName)
    }
</script>

<section class="relative overflow-clip rounded-lg" transition:fly={{ x: 50 }}>
    <div class="absolute -z-10 h-full w-full bg-black bg-cover bg-right bg-no-repeat brightness-[25%]" style="background-image: url({serviceData.icon}); mask-image: linear-gradient(to left, black, rgba(0, 0, 0, 0));" />
    <header class="flex h-20 items-center gap-4 p-4">
        <div class="relative aspect-square h-full p-1">
            <img src={serviceData.icon} alt="{serviceData.displayName} icon" />
            {#if 'profilePicture' in connectionInfo}
                <img src={connectionInfo.profilePicture} alt="" class="absolute bottom-0 right-0 aspect-square h-5 rounded-full" />
            {/if}
        </div>
        <div>
            <div>{serviceData.displayName}</div>
            <div class="text-sm text-neutral-500">
                {subHeaderItems.join(' - ')}
            </div>
        </div>
        <div class="relative ml-auto flex flex-row-reverse gap-2">
            <form action="?/deleteConnection" method="post" use:enhance={submitFunction}>
                <input type="hidden" name="connectionId" value={connectionInfo.id} />
                <button class="aspect-square h-8 text-2xl text-neutral-500 hover:text-lazuli-primary">
                    <i class="fa-solid fa-xmark" />
                </button>
            </form>
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
