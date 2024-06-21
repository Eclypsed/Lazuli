<script lang="ts">
    import type { PageServerData } from './$types.js'

    export let data: PageServerData

    async function testRequest() {
        const mixData = await fetch(`/api/v1/users/${data.user.id}fkaskdkja/mixes`, {
            credentials: 'include',
        }).then((response) => response.json())

        console.log(mixData)
    }
</script>

<div>
    <h1>This would be a good place for listen history</h1>
    <button on:click={testRequest} class="h-14 w-20 rounded-lg bg-lazuli-primary">Test Request</button>
</div>
