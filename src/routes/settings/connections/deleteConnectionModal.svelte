<script lang="ts">
    import Services from '$lib/services.json'

    export let connection: Connection
</script>

<div class="rounded-lg bg-neutral-900 p-5">
    <h1 class="pb-4 text-center">Delete {Services[connection.service.type].displayName} connection?</h1>
    <div class="flex w-60 justify-around">
        <input type="hidden" name="connectionId" value={connection.id} />
        <button class="rounded bg-neutral-800 px-4 py-2 text-center" on:click|preventDefault>Cancel</button>
        <button class="rounded bg-red-500 px-4 py-2 text-center" formaction="?/deleteConnection">Delete</button>
    </div>
</div>