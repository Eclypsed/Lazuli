<script>
    import '../app.css'
    import '@fortawesome/fontawesome-free/css/all.min.css'
    import Navbar from '$lib/components/utility/navbar.svelte'
    import AlertBox from '$lib/components/utility/alertBox.svelte'
    import { page } from '$app/stores'
    import { newestAlert } from '$lib/stores/alertStore.js'
    import { fade } from 'svelte/transition'
    import { onMount } from 'svelte'

    let alertBox
    $: addAlert($newestAlert)

    const addAlert = (alertData) => {
        if (alertBox) alertBox.addAlert(...alertData)
    }

    // Might want to change this functionallity to a fetch/preload/await for the image
    const backgroundImage = 'https://www.gstatic.com/youtube/media/ytm/images/sbg/wsbg@4000x2250.png' // <-- Default youtube music background
    let loaded = false
    onMount(() => (loaded = true))
</script>

{#if $page.url.pathname === '/api'}
    <slot />
{:else}
    <main class="h-screen font-notoSans text-white">
        {#if $page.url.pathname !== '/login'}
            <Navbar />
        {/if}
        <div class="fixed isolate -z-10 h-full w-full bg-black">
            <!-- This whole bg is a complete copy of ytmusic, design own at some point (Place for customization w/ album art etc?) (EDIT: Ok, it looks SICK with album art!) -->
            <div id="background-gradient" class="absolute z-10 h-1/2 w-full bg-cover" />
            {#if loaded}
                <!-- May want to add a small blur filter in the event that the album/song image is below a certain resolution -->
                <img id="background-image" src={backgroundImage} alt="" class="h-1/2 w-full object-cover blur-xl" in:fade={{ duration: 1000 }} />
            {/if}
        </div>
        <slot />
        <AlertBox bind:this={alertBox} />
    </main>
{/if}

<style>
    #background-gradient {
        background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.6), black);
    }
    #background-image {
        mask-image: linear-gradient(to bottom, black, rgba(0, 0, 0, 0.3));
    }
</style>
