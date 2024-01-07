<script>
    import { enhance } from '$app/forms'
    import { fly } from 'svelte/transition'
    import { JellyfinUtils } from '$lib/utils/utils'
    import Services from '$lib/services.json'
    import JellyfinAuthBox from './jellyfinAuthBox.svelte'
    import { newestAlert } from '$lib/stores/alertStore.js'
    import IconButton from '$lib/components/utility/iconButton.svelte'
    import Toggle from '$lib/components/utility/toggle.svelte'
    import { onMount } from 'svelte'

    export let data
    let existingConnections = data?.existingConnections

    const testServices = {
        jellyfin: {
            displayName: 'Jellyfin',
            type: ['streaming'],
            icon: 'https://raw.githubusercontent.com/jellyfin/jellyfin-ux/55616553b692b1a6c7d8e786eeb7d8216e9b50df/branding/SVG/icon-transparent.svg',
        },
        'youtube-music': {
            displayName: 'YouTube Music',
            type: ['streaming'],
            icon: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Youtube_Music_icon.svg',
        },
        spotify: {
            displayName: 'Spotify',
            type: ['streaming'],
            icon: 'https://upload.wikimedia.org/wikipedia/commons/8/84/Spotify_icon.svg',
        },
        'apple-music': {
            displayName: 'Apple Music',
            type: ['streaming', 'marketplace'],
            icon: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Apple_Music_icon.svg',
        },
        bandcamp: {
            displayName: 'bandcamp',
            type: ['marketplace', 'streaming'],
            icon: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Bandcamp-button-bc-circle-aqua.svg',
        },
        soundcloud: {
            displayName: 'SoundCloud',
            type: ['streaming'],
            icon: 'https://www.vectorlogo.zone/logos/soundcloud/soundcloud-icon.svg',
        },
        lastfm: {
            displayName: 'Last.fm',
            type: ['analytics'],
            icon: 'https://upload.wikimedia.org/wikipedia/commons/c/c4/Lastfm.svg',
        },
        plex: {
            displayName: 'Plex',
            type: ['streaming'],
            icon: 'https://www.vectorlogo.zone/logos/plextv/plextv-icon.svg',
        },
        deezer: {
            displayName: 'deezer',
            type: ['streaming'],
            icon: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Deezer_Icon.svg',
        },
        'amazon-music': {
            displayName: 'Amazon Music',
            type: ['streaming', 'marketplace'],
            icon: 'https://upload.wikimedia.org/wikipedia/commons/9/92/Amazon_Music_logo.svg',
        },
    }

    const serviceAuthenticationMethods = {}

    let formMode = null
    const submitCredentials = ({ formData, action, cancel }) => {
        switch (action.search) {
            case '?/authenticateJellyfin':
                const { serverUrl, username, password } = Object.fromEntries(formData)

                if (!(serverUrl && username && password)) {
                    cancel()
                    return ($newestAlert = ['caution', 'All fields must be filled out'])
                }
                try {
                    new URL(serverUrl)
                } catch {
                    cancel()
                    return ($newestAlert = ['caution', 'Server URL is invalid'])
                }

                const deviceId = JellyfinUtils.getLocalDeviceUUID()
                formData.append('deviceId', deviceId)
                break
            case '?/deleteConnection':
                const connection = formData.get('service')
                $newestAlert = ['info', `Delete ${connection}`]
                cancel()
                break
            default:
                cancel()
        }

        return async ({ result }) => {
            switch (result.type) {
                case 'failure':
                    return ($newestAlert = ['warning', result.data.message])
                case 'success':
                    formMode = null
                    return ($newestAlert = ['success', result.data.message])
            }
        }
    }

    let modal
</script>

<main class="h-full">
    <section class="mb-8 rounded-lg px-4" style="background-color: rgba(82, 82, 82, 0.25);">
        <h1 class="py-2 text-xl">Add Connection</h1>
        <div class="flex flex-wrap gap-2 pb-4">
            {#each Object.entries(testServices) as [serviceType, serviceData]}
                {#if !existingConnections.includes(serviceType)}
                    <button class="bg-ne h-14 rounded-md" style="background-image: linear-gradient(to bottom, rgb(30, 30, 30), rgb(10, 10, 10));" on:click={() => (modal = JellyfinAuthBox)}>
                        <img src={serviceData.icon} alt="{serviceData.displayName} icon" class="aspect-square h-full p-2" />
                    </button>
                {/if}
            {/each}
        </div>
    </section>
    {#if existingConnections}
        <div class="grid gap-8">
            {#each existingConnections as connectionType}
                {@const service = Services[connectionType]}
                <section class="overflow-hidden rounded-lg" style="background-color: rgba(82, 82, 82, 0.25);" in:fly={{ duration: 300, x: 50 }}>
                    <header class="flex h-20 items-center gap-4 p-4">
                        <img src={service.icon} alt="{service.displayName} icon" class="aspect-square h-full p-1" />
                        <div>
                            <div>Account Name</div>
                            <div class="text-sm text-neutral-500">{service.displayName}</div>
                        </div>
                        <div class="ml-auto h-8">
                            <IconButton on:click={() => (modal = `delete-${connectionType}`)}>
                                <i slot="icon" class="fa-solid fa-link-slash" />
                            </IconButton>
                        </div>
                    </header>
                    <hr class="mx-2 border-t-2 border-neutral-600" />
                    <div class="p-4 text-sm text-neutral-400">
                        <div class="grid grid-cols-[3rem_auto] gap-4">
                            <Toggle on:toggled={(event) => console.log(event.detail.toggleState)} />
                            <span>Enable Connection</span>
                        </div>
                    </div>
                </section>
            {/each}
        </div>
    {/if}
    {#if modal}
        <form method="post" use:enhance={submitCredentials} transition:fly={{ duration: 300, y: -15 }} class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {#if typeof modal === 'string'}
                {@const connectionType = modal.replace('delete-', '')}
                {@const service = Services[connectionType]}
                <div class="rounded-lg bg-neutral-900 p-5">
                    <h1 class="pb-4 text-center">Delete {service.displayName}?</h1>
                    <div class="flex w-60 justify-around">
                        <input type="hidden" name="service" value={connectionType} />
                        <button class="rounded bg-neutral-800 px-4 py-2 text-center" on:click={() => (modal = null)}>Cancel</button>
                        <button class="rounded bg-red-500 px-4 py-2 text-center" formaction="?/deleteConnection">Delete</button>
                    </div>
                </div>
            {:else}
                <svelte:component this={modal} on:close={() => (modal = null)} />
            {/if}
        </form>
    {/if}
</main>
