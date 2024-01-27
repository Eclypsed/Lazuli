<script lang="ts">
    import IconButton from '$lib/components/util/iconButton.svelte'
    import type { LayoutData } from '../$types'
    import { goto } from '$app/navigation'

    export let data: LayoutData
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
        <div>This is where things like history would go</div>
    </section>
</main>
