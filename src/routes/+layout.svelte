<script lang="ts">
    import '../app.css'
    import '@fortawesome/fontawesome-free/css/all.min.css'
    import AlertBox from '$lib/components/util/alertBox.svelte'
    import { newestAlert, backgroundImage, pageWidth } from '$lib/stores'
    import { fade } from 'svelte/transition'

    let alertBox: AlertBox
    $: if ($newestAlert !== null && alertBox) alertBox.addAlert(...$newestAlert)
</script>

<svelte:window bind:innerWidth={$pageWidth} />
<div class="no-scrollbar relative font-notoSans text-white">
    <div class="fixed isolate -z-10 h-full w-screen bg-black">
        <div id="background-gradient" class="absolute z-10 h-1/2 w-full bg-cover" />
        {#key $backgroundImage}
            <img id="background-image" src={$backgroundImage} alt="" class="absolute h-1/2 w-full object-cover blur-lg" transition:fade={{ duration: 1000 }} />
        {/key}
    </div>
    <slot />
    <AlertBox bind:this={alertBox} />
</div>

<style>
    #background-gradient {
        background: linear-gradient(to bottom, rgba(0, 0, 0, 0.7), black);
    }
    #background-image {
        mask-image: linear-gradient(to bottom, black, rgba(0, 0, 0, 0.3));
    }
</style>
