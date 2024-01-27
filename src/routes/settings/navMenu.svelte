<script lang="ts">
    import IconButton from '$lib/components/util/iconButton.svelte'
</script>

<nav class="flex w-full flex-col divide-y-2 divide-neutral-700 rounded-lg bg-neutral-800 px-4 text-xl">
    <button class="flex items-center justify-between px-4 py-6">
        <span>
            <i class="fa-solid fa-circle-nodes mr-2" />
            Connections
        </span>
        <i class="fa-solid fa-arrow-right" />
    </button>
    <button class="flex items-center justify-between px-4 py-6">
        <span>
            <i class="fa-solid fa-mobile-screen mr-2" />
            Devices
        </span>
        <i class="fa-solid fa-arrow-right" />
    </button>
</nav>
