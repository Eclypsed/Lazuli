<script lang="ts">
    import IconButton from '$lib/components/util/iconButton.svelte'
</script>

<main class="h-full">
    <h1 class="sticky top-0 grid grid-cols-[1fr_auto_1fr] grid-rows-1 items-center text-2xl">
        <IconButton on:click={() => history.back()}>
            <i slot="icon" class="fa-solid fa-arrow-left" />
        </IconButton>
        <span>Account</span>
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
