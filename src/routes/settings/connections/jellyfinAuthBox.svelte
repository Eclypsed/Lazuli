<script>
    import { createEventDispatcher } from 'svelte'

    const dispatch = createEventDispatcher()
    const dispatchClose = () => {
        dispatch('close')
    }
</script>

<div id="main-box" class="relative flex aspect-video w-screen max-w-2xl flex-col justify-center gap-9 rounded-xl bg-neutral-900 px-8">
    <h1 class="text-center text-4xl">Jellyfin Sign In</h1>
    <div class="flex w-full flex-col gap-5">
        <input type="text" name="serverUrl" autocomplete="off" placeholder="Server Url" class="border-jellyfin-blue h-10 w-full border-b-2 bg-transparent px-1 outline-none" />
        <div class="flex w-full flex-row gap-4">
            <input type="text" name="username" autocomplete="off" placeholder="Username" class="border-jellyfin-blue h-10 w-full border-b-2 bg-transparent px-1 outline-none" />
            <input type="password" name="password" placeholder="Password" class="border-jellyfin-blue h-10 w-full border-b-2 bg-transparent px-1 outline-none" />
        </div>
    </div>
    <div class="flex items-center justify-around text-lg">
        <button id="cancel-button" type="button" class="w-1/3 rounded bg-neutral-800 py-2 transition-all active:scale-[97%]" on:click|preventDefault={dispatchClose}>Cancel</button>
        <button id="submit-button" type="submit" class="bg-jellyfin-blue w-1/3 rounded py-2 transition-all active:scale-[97%]" formaction="?/authenticateJellyfin">Submit</button>
    </div>
</div>

<style>
    @property --gradient-angle {
        syntax: '<angle>';
        initial-value: 0deg;
        inherits: false;
    }
    @keyframes rotation {
        0% {
            --gradient-angle: 0deg;
        }
        100% {
            --gradient-angle: 360deg;
        }
    }
    #main-box::before {
        content: '';
        position: absolute;
        inset: -0.1rem;
        z-index: -1;
        background: conic-gradient(from var(--gradient-angle), var(--jellyfin-purple), var(--jellyfin-blue), var(--jellyfin-purple));
        border-radius: inherit;
        animation: rotation 15s linear infinite;
        filter: blur(0.5rem);
    }
    #cancel-button:hover {
        background-color: rgb(30 30 30);
    }
    #submit-button:hover {
        background-color: color-mix(in srgb, var(--jellyfin-blue) 80%, black);
    }
</style>
