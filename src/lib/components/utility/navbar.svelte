<script>
    import IconButton from './iconButton.svelte'
    import { goto } from '$app/navigation'
    import { page } from '$app/stores'
</script>

<nav class="sticky top-0 z-10 grid grid-cols-[1fr_auto_1fr] items-center duration-300">
    <section class="flex h-full">
        <IconButton on:click={() => goto('/settings')}>
            <i slot="icon" class="fa-solid fa-user-gear" />
        </IconButton>
        {#if $page.url.pathname !== '/'}
            <IconButton on:click={() => history.back()}>
                <i slot="icon" class="fa-solid fa-arrow-left" />
            </IconButton>
        {/if}
    </section>
    <section class="flex h-full justify-center">
        <slot name="center-content" />
    </section>
    <section class="flex h-full justify-end">
        <IconButton>
            <i slot="icon" class="fa-solid fa-magnifying-glass" />
        </IconButton>
    </section>
</nav>

<style>
    nav {
        padding: 20px 2rem;
        font-size: 20px;
        line-height: 28px;
    }
    section {
        gap: 24px;
    }
</style>
