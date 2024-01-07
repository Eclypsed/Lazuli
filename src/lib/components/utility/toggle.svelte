<script>
    export let toggled = false

    import { createEventDispatcher } from 'svelte'
    const dispatch = createEventDispatcher()

    let toggle, knob

    const handleToggle = () => {
        toggled = !toggled
        if (toggled) {
            toggle.style.backgroundColor = 'var(--lazuli-primary)'
            knob.style.left = '100%'
            knob.style.transform = 'translateX(-100%)'
        } else {
            toggle.style.backgroundColor = 'rgb(115, 115, 115)'
            knob.style.left = 0
            knob.style.transform = ''
        }
        dispatch('toggled', {
            toggleState: toggled,
        })
    }
</script>

<button bind:this={toggle} aria-checked={toggle} role="checkbox" class="relative flex h-6 w-10 items-center rounded-full bg-neutral-500 transition-colors" on:click={handleToggle}>
    <div bind:this={knob} class="absolute left-0 aspect-square h-full p-1 transition-all">
        <div class="h-full w-full rounded-full bg-white"></div>
    </div>
</button>
