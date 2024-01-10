<script>
    import { onMount } from 'svelte'
    import { newestAlert } from '$lib/stores/alertStore.js'

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
    <main id="recommendations-wrapper" class="p-12 pt-24">
        <section class="no-scrollbar flex gap-6 overflow-scroll">
            {#each data.recommendations as recommendation}
                <div class="aspect-[4/5] w-56 flex-shrink-0">
                    <!-- Add placeholder image for when recommendation.image is null -->
                    <img class="aspect-square w-full rounded-md object-cover" src="{recommendation.image}?width=224&height=224" alt="{recommendation.name} art" />
                    <div class="mt-3 px-1 text-sm">
                        <div>{recommendation.name}</div>
                        <div class="text-neutral-400">{Array.from(recommendation.artists, (artist) => artist.name).join(', ')}</div>
                    </div>
                </div>
            {/each}
        </section>
    </main>
{/if}
