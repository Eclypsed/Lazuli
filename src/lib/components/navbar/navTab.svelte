<script lang="ts">
    import { goto } from '$app/navigation'

    export let icon: string
    export let label: string
    export let redirect: string

    export let disabled: boolean
</script>

<button {disabled} class="block w-full py-2 text-left" on:click={() => goto(redirect)}>
    <span class:disabled class="py-1 pl-8 {disabled ? 'text-lazuli-primary' : 'text-neutral-300'}">
        <i class="{icon} mr-1.5 h-5 w-5" />
        {label}
    </span>
</button>

<style>
    span.disabled {
        border-left: 2px solid var(--lazuli-primary);
        background: linear-gradient(to right, var(--lazuli-primary) -25%, transparent 25%);
    }
</style>
