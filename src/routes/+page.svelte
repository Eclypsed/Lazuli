<script>
    import { onMount } from 'svelte'
    import { newestAlert } from '$lib/stores/alertStore.js'
    import Card from '$lib/components/media/mediaCard.svelte'

    export let data

    onMount(() => {
        const logFetchError = (index, errors) => {
            if (index >= errors.length) return

            const errorMessage = errors[index]
            $newestAlert = ['warning', errorMessage]

            setTimeout(() => logFetchError((index += 1), errors), 100)
        }

        logFetchError(0, data.fetchingErrors)
    })
</script>

{#if !data.recommendations && data.fetchingErrors.length === 0}
    <main class="flex h-full flex-col items-center justify-center gap-4 text-center">
        <h1 class="text-4xl">Let's Add Some Connections</h1>
        <p class="text-neutral-400">Click the menu in the top left corner and go to Settings &gt; Connections to link to your accounts</p>
    </main>
{:else}
    <main id="recommendations-wrapper" class="pt-24">
        <section>
            <h1 class="px-12 text-4xl"><strong>Listen Again</strong></h1>
            <div class="no-scrollbar flex gap-6 overflow-scroll px-12 py-4">
                {#each data.recommendations as recommendation}
                    <Card mediaData={recommendation} />
                {/each}
            </div>
        </section>
    </main>
{/if}
