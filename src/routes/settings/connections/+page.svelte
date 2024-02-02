<script lang="ts">
    import { fly } from 'svelte/transition'
    import Services from '$lib/services.json'
    import JellyfinAuthBox from './jellyfinAuthBox.svelte'
    import { newestAlert } from '$lib/stores.js'
    import type { PageServerData } from './$types.js'
    import type { SubmitFunction } from '@sveltejs/kit'
    import { getDeviceUUID } from '$lib/utils'
    import { SvelteComponent, type ComponentType } from 'svelte'
    import ConnectionProfile from './connectionProfile.svelte'

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
                    formData.set('serverUrl', new URL(serverUrl.toString()).origin)
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

                        newConnectionModal = null
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

    let newConnectionModal: ComponentType<SvelteComponent<{ submitFunction: SubmitFunction }>> | null = null
</script>

<main>
    <section class="mb-8 rounded-lg px-4" style="background-color: rgba(82, 82, 82, 0.25);">
        <h1 class="py-2 text-xl">Add Connection</h1>
        <div class="flex flex-wrap gap-2 pb-4">
            <button class="add-connection-button h-14 rounded-md" on:click={() => (newConnectionModal = JellyfinAuthBox)}>
                <img src={Services.jellyfin.icon} alt="{Services.jellyfin.displayName} icon" class="aspect-square h-full p-2" />
            </button>
            <button class="add-connection-button h-14 rounded-md">
                <img src={Services['youtube-music'].icon} alt="{Services['youtube-music'].displayName} icon" class="aspect-square h-full p-2" />
            </button>
        </div>
    </section>
    <div class="grid gap-8">
        {#each connections as connection}
            <ConnectionProfile {connection} submitFunction={submitCredentials} />
        {/each}
    </div>
    <svelte:component this={newConnectionModal} submitFunction={submitCredentials} on:close={() => (newConnectionModal = null)} />
</main>

<style>
    .add-connection-button {
        background-image: linear-gradient(to bottom, rgb(30, 30, 30), rgb(10, 10, 10));
    }
</style>
