<script lang="ts">
    import { goto } from '$app/navigation'

    export let color: string
    export let name: string
    export let id: string

    export let disabled: boolean = false
</script>

<button style="--mix-color: {color};" {disabled} class="block w-full overflow-hidden text-ellipsis py-3 text-left" on:click={() => goto(`/mixes/${id}`)}>
    <span class:disabled class="relative text-nowrap py-1 pl-6">{name}</span>
</button>

<style>
    span:hover {
        color: var(--mix-color);
    }
    span.disabled {
        color: var(--mix-color);
    }
    span::before {
        content: '•';
        margin-right: 0.75rem;
        font-weight: 900;
        color: var(--mix-color);
    }
    span::after {
        content: '';
        width: 100%;
        height: 0;
        position: absolute;
        top: 50%;
        left: 0;
        transform: translateY(-50%);
        background: linear-gradient(to right, var(--mix-color) 2px, color-mix(in srgb, var(--mix-color), transparent) 2px, transparent 20%);
        transition: height 100ms linear;
    }
    span.disabled::after {
        height: 100%;
    }
</style>
