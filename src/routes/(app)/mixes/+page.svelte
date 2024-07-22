<script lang="ts">
    import IconButton from '$lib/components/util/iconButton.svelte'
    import IcBaselinePlus from '~icons/ic/baseline-plus'
</script>

<main class="flex flex-wrap justify-center">
    <div class="grid aspect-square h-56 place-items-center">
        <div class="aspect-square h-16">
            <IconButton halo={true}>
                <IcBaselinePlus slot="icon" class="text-4xl text-neutral-300" />
            </IconButton>
        </div>
    </div>
</main>
