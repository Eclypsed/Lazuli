<script>
    import IconButton from '$lib/components/util/iconButton.svelte'
</script>

<main class="h-full">
    <h1 class="sticky top-0 grid grid-cols-[1fr_auto_1fr] grid-rows-1 items-center">
        <IconButton on:click={() => history.back()}>
            <i slot="icon" class="fa-solid fa-arrow-left text-2xl" />
        </IconButton>
        <span class="text-3xl">Account</span>
    </h1>
    <section class="px-[5vw]">
        <slot />
    </section>
</main>

<style>
    h1 {
        height: 80px;
        padding: 16px 5vw;
    }
</style>
