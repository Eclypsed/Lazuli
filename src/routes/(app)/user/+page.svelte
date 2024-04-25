<script lang="ts">
    import IconButton from '$lib/components/util/iconButton.svelte'
    import { goto } from '$app/navigation'
    import type { LayoutData } from '../$types'
    import Services from '$lib/services.json'
    import JellyfinIcon from '$lib/static/jellyfin-icon.svg'
    import YouTubeMusicIcon from '$lib/static/youtube-music-icon.svg'
    import JellyfinAuthBox from './jellyfinAuthBox.svelte'
    import { newestAlert } from '$lib/stores.js'
    import type { PageServerData } from './$types.js'
    import type { SubmitFunction } from '@sveltejs/kit'
    import { getDeviceUUID } from '$lib/utils'
    import { SvelteComponent, type ComponentType } from 'svelte'
    import ConnectionProfile from './connectionProfile.svelte'
    import { enhance } from '$app/forms'
    import { PUBLIC_YOUTUBE_API_CLIENT_ID } from '$env/static/public'
    import { onMount } from 'svelte'

    export let data: PageServerData & LayoutData
    let connections: ConnectionInfo[]
    onMount(async () => {
        connections = await data.connections
    })

    const authenticateJellyfin: SubmitFunction = ({ formData, cancel }) => {
        const { serverUrl, username, password } = Object.fromEntries(formData)

        if (!(serverUrl && username && password)) {
            $newestAlert = ['caution', 'All fields must be filled out']
            return cancel()
        }

        if (!URL.canParse(serverUrl.toString())) {
            $newestAlert = ['caution', 'Server URL is invalid']
            return cancel()
        }

        formData.set('serverUrl', new URL(serverUrl.toString()).origin)

        const deviceId = getDeviceUUID()
        formData.append('deviceId', deviceId)

        return ({ result }) => {
            if (result.type === 'failure') {
                return ($newestAlert = ['warning', result.data?.message])
            } else if (result.type === 'success') {
                const newConnection = result.data!.newConnection
                connections = [...connections, newConnection]

                newConnectionModal = null
                return ($newestAlert = ['success', `Added Jellyfin`])
            }
        }
    }

    const authenticateYouTube: SubmitFunction = async ({ formData, cancel }) => {
        const googleLoginProcess = (): Promise<string> => {
            return new Promise((resolve) => {
                // @ts-ignore (google variable is a global variable imported by html script tag)
                const client = google.accounts.oauth2.initCodeClient({
                    client_id: PUBLIC_YOUTUBE_API_CLIENT_ID,
                    scope: 'https://www.googleapis.com/auth/youtube',
                    ux_mode: 'popup',
                    callback: (response: any) => {
                        resolve(response.code)
                    },
                })
                client.requestCode()
            })
        }

        const code = await googleLoginProcess()
        if (!code) cancel()
        formData.append('code', code)

        return ({ result }) => {
            if (result.type === 'failure') {
                return ($newestAlert = ['warning', result.data?.message])
            } else if (result.type === 'success') {
                const newConnection = result.data!.newConnection
                connections = [...connections, newConnection]
                return ($newestAlert = ['success', 'Added Youtube Music'])
            }
        }
    }

    const profileActions: SubmitFunction = () => {
        return ({ result }) => {
            if (result.type === 'failure') {
                return ($newestAlert = ['warning', result.data?.message])
            } else if (result.type === 'success') {
                const id = result.data!.deletedConnectionId
                const indexToDelete = connections.findIndex((connection) => connection.id === id)
                const serviceType = connections[indexToDelete].type

                connections.splice(indexToDelete, 1)
                connections = connections

                return ($newestAlert = ['success', `Deleted ${Services[serviceType].displayName}`])
            }
        }
    }

    let newConnectionModal: ComponentType<SvelteComponent<{ submitFunction: SubmitFunction }>> | null = null
</script>

<main class="flex flex-col gap-8">
    <section class="flex items-center justify-between text-xl">
        <div class="flex items-center gap-4">
            <div class="grid aspect-square h-36 place-items-center rounded-full bg-neutral-800">
                <i class="fa-solid fa-user text-6xl text-neutral-400" />
            </div>
            <div>
                <div>{data.user.username}</div>
                <div class="text-base text-neutral-400">Other info about the user</div>
            </div>
        </div>
        <div class="flex h-10 gap-6">
            <IconButton on:click={() => goto('/settings')} halo={true}>
                <i slot="icon" class="fa-solid fa-gear" />
            </IconButton>
            <IconButton halo={true}>
                <i slot="icon" class="fa-solid fa-right-from-bracket" />
            </IconButton>
        </div>
    </section>
    <section>
        <section class="mb-8 rounded-lg px-4" style="background-color: rgba(82, 82, 82, 0.25);">
            <h1 class="py-2 text-xl">Add Connection</h1>
            <div class="flex flex-wrap gap-2 pb-4">
                <button class="add-connection-button h-14 rounded-md" on:click={() => (newConnectionModal = JellyfinAuthBox)}>
                    <img src={JellyfinIcon} alt="Jellyfin icon" class="aspect-square h-full p-2" />
                </button>
                <form method="post" action="?/youtubeMusicLogin" use:enhance={authenticateYouTube}>
                    <button class="add-connection-button h-14 rounded-md">
                        <img src={YouTubeMusicIcon} alt="YouTube Music icon" class="aspect-square h-full p-2" />
                    </button>
                </form>
            </div>
        </section>
        <div id="connection-profile-grid" class="grid gap-8">
            {#if connections}
                {#each connections as connectionInfo}
                    <ConnectionProfile {connectionInfo} submitFunction={profileActions} />
                {/each}
            {/if}
        </div>
        {#if newConnectionModal !== null}
            <svelte:component this={newConnectionModal} submitFunction={authenticateJellyfin} on:close={() => (newConnectionModal = null)} />
        {/if}
    </section>
</main>

<style>
    .add-connection-button {
        background-image: linear-gradient(to bottom, rgb(30, 30, 30), rgb(10, 10, 10));
    }
    #connection-profile-grid {
        grid-template-columns: repeat(auto-fit, minmax(28rem, 1fr));
    }
</style>
