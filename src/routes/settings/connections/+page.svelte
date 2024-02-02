<script lang="ts">
    import { enhance } from '$app/forms'
    import { fly } from 'svelte/transition'
    import Services from '$lib/services.json'
    import JellyfinAuthBox from './jellyfinAuthBox.svelte'
    import { newestAlert } from '$lib/stores.js'
    import IconButton from '$lib/components/util/iconButton.svelte'
    import Toggle from '$lib/components/util/toggle.svelte'
    import type { PageServerData } from './$types.js'
    import type { SubmitFunction } from '@sveltejs/kit'
    import { getDeviceUUID } from '$lib/utils'
    import DeleteConnectionModal from './deleteConnectionModal.svelte'

    export let data: PageServerData
    let connections = data.userConnections

    const submitCredentials: SubmitFunction = ({ formData, action, cancel }) => {
        switch (action.search) {
            case '?/authenticateJellyfin':
                const { serverUrl, username, password } = Object.fromEntries(formData)

                if (!(serverUrl && username && password)) {
                    $newestAlert = ['caution', 'All fields must be filled out']
                    return cancel()
                }
                try {
                    new URL(serverUrl.toString())
                } catch {
                    $newestAlert = ['caution', 'Server URL is invalid']
                    return cancel()
                }

                const deviceId = getDeviceUUID()
                formData.append('deviceId', deviceId)
                break
            case '?/deleteConnection':
                break
            default:
                cancel()
        }

        return async ({ result }) => {
            switch (result.type) {
                case 'failure':
                    return ($newestAlert = ['warning', result.data?.message])
                case 'success':
                    if (result.data?.newConnection) {
                        const newConnection: Connection = result.data.newConnection
                        connections = [newConnection, ...connections]

                        return ($newestAlert = ['success', `Added ${Services[newConnection.service.type].displayName}`])
                    } else if (result.data?.deletedConnectionId) {
                        const id = result.data.deletedConnectionId
                        const indexToDelete = connections.findIndex((connection) => connection.id === id)
                        const serviceType = connections[indexToDelete].service.type

                        connections.splice(indexToDelete, 1)
                        connections = connections

                        return ($newestAlert = ['success', `Deleted ${Services[serviceType].displayName}`])
                    }
            }
        }
    }

    const openModal = (type: 'jellyfin' | 'delete', connection?: Connection) => {
        switch (type) {
            case 'jellyfin':
                const jellyfinModal = new JellyfinAuthBox({
                    target: modalForm
                })

                jellyfinModal.$on('close', () => jellyfinModal.$destroy())
            case 'delete':
                if (!connection) throw new Error('Connection required for delete modal')
                const deleteConnectionModal = new DeleteConnectionModal({
                    target: modalForm,
                    props: { connection }
                })
        }
    }

    let modalForm: HTMLFormElement
</script>

<main>
    <section class="mb-8 rounded-lg px-4" style="background-color: rgba(82, 82, 82, 0.25);">
        <h1 class="py-2 text-xl">Add Connection</h1>
        <div class="flex flex-wrap gap-2 pb-4">
            <button class="h-14 rounded-md add-connection-button" on:click={() => modalForm}>
                <img src={Services.jellyfin.icon} alt="{Services.jellyfin.displayName} icon" class="aspect-square h-full p-2" />
            </button>
            <button class="h-14 rounded-md add-connection-button">
                <img src={Services['youtube-music'].icon} alt="{Services['youtube-music'].displayName} icon" class="aspect-square h-full p-2" />
            </button>
        </div>
    </section>
    <div class="grid gap-8">
        {#each connections as connection}
            {@const serviceData = Services[connection.service.type]}
            <section class="overflow-hidden rounded-lg" style="background-color: rgba(82, 82, 82, 0.25);" transition:fly={{ x: 50 }}>
                <header class="flex h-20 items-center gap-4 p-4">
                    <img src={serviceData.icon} alt="{serviceData.displayName} icon" class="aspect-square h-full p-1" />
                    <div>
                        <div>{connection.service?.username ? connection.service.username : 'Placeholder Account Name'}</div>
                        <div class="text-sm text-neutral-500">
                            {serviceData.displayName}
                            {#if connection.service.type === 'jellyfin' && connection.service?.serverName}
                                - {connection.service.serverName}
                            {/if}
                        </div>
                    </div>
                    <div class="ml-auto h-8">
                        <IconButton>
                            <i slot="icon" class="fa-solid fa-link-slash" />
                        </IconButton>
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
        {/each}
    </div>
    <form bind:this={modalForm} method="post" use:enhance={submitCredentials} class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"></form>
</main>

<style>
    .add-connection-button {
        background-image: linear-gradient(to bottom, rgb(30, 30, 30), rgb(10, 10, 10));
    }
</style>