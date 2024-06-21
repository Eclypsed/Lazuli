<script lang="ts">
    import { goto } from '$app/navigation'

    export let icon: string
    export let label: string
    export let redirect: string

    export let disabled: boolean = false
</script>

<button {disabled} class="block w-full overflow-hidden text-ellipsis py-2 text-left" on:click={() => goto(redirect)}>
    <span class:disabled class="relative text-nowrap py-1 pl-6 text-neutral-300">
        <i class="{icon} mr-1.5 h-5 w-5" />
        {label}
    </span>
</button>

<style>
    span:hover {
        color: var(--lazuli-primary);
    }
    span.disabled {
        color: var(--lazuli-primary);
    }
    span::before {
        content: '';
        width: 100%;
        height: 0;
        position: absolute;
        top: 50%;
        left: 0;
        transform: translateY(-50%);
        background: linear-gradient(to right, var(--lazuli-primary) 2px, color-mix(in srgb, var(--lazuli-primary), transparent) 2px, transparent 20%);
        transition: height 100ms linear;
    }
    span.disabled:before {
        height: 100%;
    }
</style>
