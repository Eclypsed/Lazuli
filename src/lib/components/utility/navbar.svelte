<script>
    import IconButton from './iconButton.svelte'
    import { goto } from '$app/navigation'
    import { page } from '$app/stores'

    let windowY = 0
</script>

<svelte:window bind:scrollY={windowY} />
<nav class="sticky top-0 z-10 flex items-center justify-between px-8 duration-300" class:background-active={windowY > 0}>
    <section class="flex h-full">
        <IconButton>
            <i slot="icon" class="fa-solid fa-gear" />
        </IconButton>
        {#if $page.url.pathname !== '/'}
            <IconButton on:click={() => goto('/')}>
                <i slot="icon" class="fa-solid fa-house" />
            </IconButton>
            <IconButton on:click={() => history.back()}>
                <i slot="icon" class="fa-solid fa-arrow-left" />
            </IconButton>
        {/if}
    </section>
    <section class="flex h-full">
        <IconButton>
            <i slot="icon" class="fa-solid fa-magnifying-glass" />
        </IconButton>
        <IconButton>
            <i slot="icon" class="fa-solid fa-user" />
        </IconButton>
    </section>
</nav>

<style>
    nav {
        height: 64px;
        padding-top: 16px;
        padding-bottom: 16px;
        font-size: 20px;
        line-height: 28px;
    }
    nav.background-active {
        background-color: rgb(10, 10, 10);
    }
    section {
        gap: 24px;
    }
</style>
