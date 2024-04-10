<script lang="ts">
    import { onMount } from 'svelte'
    import { fade } from 'svelte/transition'
    import { currentlyPlaying } from '$lib/stores'
    import { FastAverageColor } from 'fast-average-color'
    import Slider from '$lib/components/util/slider.svelte'

    export let song: Song

    let playing = false,
        shuffle = false,
        repeat = false

    let bgColor = 'black',
        primaryColor = 'var(--lazuli-primary)'

    const rgbToHsl = (red: number, green: number, blue: number): [number, number, number] => {
        ;[red, green, blue].forEach((color) => {
            if (!(color <= 255 && color >= 0)) throw new Error('RGB values must be between 0 and 255')
        })
        ;(red /= 255), (green /= 255), (blue /= 255)

        const max = Math.max(red, green, blue),
            min = Math.min(red, green, blue)
        let hue = 0,
            saturation = 0,
            lightness = (max + min) / 2

        if (max !== min) {
            const delta = max - min
            saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min)

            switch (max) {
                case red:
                    hue = (green - blue) / delta + (green < blue ? 6 : 0)
                    break
                case green:
                    hue = (blue - red) / delta + 2
                    break
                case blue:
                    hue = (red - green) / delta + 4
                    break
            }

            hue /= 6
        }

        return [hue, saturation, lightness]
    }

    const fac = new FastAverageColor()
    $: fac.getColorAsync(`/api/remoteImage?url=${song.thumbnail}`, { algorithm: 'dominant' }).then((color) => {
        const [red, green, blue] = color.value
        const percievedLightness = Math.sqrt(0.299 * red ** 2 + 0.587 * green ** 2 + 0.114 * blue ** 2)
        const redScalar = 0.547,
            greenScalar = 0.766,
            blueScalar = 0.338
        // const [hue, staturation, lightness] = rgbToHsl(red, green, blue)
        // bgColor = `hsl(${hue * 359} ${staturation * 100}% 20%)`
        // primaryColor = `hsl(${hue * 359} ${staturation * 100}% 70%)`
        bgColor = `rgb(${red}, ${green}, ${blue})`
        primaryColor = `rgb(${red}, ${green}, ${blue})`
    })
</script>

<main class="relative m-4 flex h-24 flex-grow-0 gap-4 overflow-clip rounded-xl text-white transition-colors duration-1000" style="background-color: {bgColor};">
    <img src="/api/remoteImage?url={song.thumbnail}" alt="" class="aspect-square max-h-full object-cover" />
    <section class="flex w-96 flex-col justify-center gap-1">
        <div class="line-clamp-2">{song.name}</div>
        <div class="text-sm text-neutral-400">{song.artists?.map((artist) => artist.name) || song.createdBy?.name}</div>
    </section>
    <section class="flex w-96 flex-col items-center justify-center gap-4">
        <div class="flex items-center gap-3 text-xl">
            <button on:click={() => (shuffle = !shuffle)} class="aspect-square h-8">
                <i class="fa-solid fa-shuffle" style="color: {shuffle ? primaryColor : 'rgb(163, 163, 163)'};" />
            </button>
            <button class="aspect-square h-8">
                <i class="fa-solid fa-backward-step" />
            </button>
            <button on:click={() => (playing = !playing)} class="grid aspect-square h-10 place-items-center rounded-full bg-white">
                <i class="fa-solid {playing ? 'fa-pause' : 'fa-play'} text-black" />
            </button>
            <button class="aspect-square h-8">
                <i class="fa-solid fa-forward-step" />
            </button>
            <button on:click={() => (repeat = !repeat)} class="aspect-square h-8">
                <i class="fa-solid fa-repeat" style="color: {repeat ? primaryColor : 'rgb(163, 163, 163)'};" />
            </button>
        </div>
        <Slider sliderColor={primaryColor} />
    </section>
</main>

<!-- <main class="h-screen w-full">
    <div class="relative h-full overflow-hidden">
        <div class="absolute z-0 flex h-full w-full items-center justify-items-center bg-neutral-900">
            <div class="absolute z-10 h-full w-full backdrop-blur-3xl"></div>
            {#key song}
                <img in:fade src={song.thumbnail} alt="" class="absolute h-full w-full object-cover brightness-50" />
            {/key}
        </div>
        <div class="absolute grid h-full w-full grid-rows-[auto_8rem_3rem_6rem] justify-items-center p-8">
            {#key song}
                <img in:fade src={song.thumbnail} alt="" class="h-full min-h-[8rem] overflow-hidden rounded-xl object-contain p-2" />
            {/key}
            <div in:fade class="flex flex-col items-center justify-center gap-1 px-8 text-center font-notoSans">
                {#key song}
                    <span class="text-3xl text-neutral-300">{song.name}</span>
                    {#if song.album?.name}
                        <span class="text-xl text-neutral-300">{song.album.name}</span>
                    {/if}
                    <span class="text-xl text-neutral-300">{song.artists?.map((artist) => artist.name).join(' / ') || song.createdBy?.name}</span>
                {/key}
            </div>
            <input
                id="progress-bar"
                on:mouseup={() => (audioSource.currentTime = audioSource.duration * Number(progressBar.value))}
                type="range"
                value="0"
                min="0"
                max="1"
                step="any"
                class="w-[90%] cursor-pointer rounded-lg bg-gray-400"
            />
            <div class="flex h-full w-11/12 justify-around overflow-hidden text-3xl text-white">
                <button class="relative z-0 aspect-square max-h-full max-w-full overflow-hidden rounded-full">
                    <i class="fa-solid fa-backward-step" />
                </button>
                <button class="relative z-0 aspect-square max-h-full max-w-full overflow-hidden rounded-full">
                    <i class={playing ? 'fa-solid fa-pause' : 'fa-solid fa-play'} />
                </button>
                <button on:click={() => ($currentlyPlaying = null)} class="relative z-0 aspect-square max-h-full max-w-full overflow-hidden rounded-full">
                    <i class="fa-solid fa-stop" />
                </button>
                <button class="relative z-0 aspect-square max-h-full max-w-full overflow-hidden rounded-full">
                    <i class="fa-solid fa-forward-step" />
                </button>
            </div>
        </div>
    </div>
    <div class="no-scrollbar flex w-full flex-col items-center divide-y-[1px] divide-[#353535] overflow-y-scroll bg-neutral-900 p-4">
        <div>This is where playlist items go</div>
    </div>
    {#key song}
        <audio bind:this={audioSource} id="audio" class="hidden" src="/api/audio?id={song.id}&connection={song.connection}" />
    {/key}
</main> -->

<!-- <style>
    main {
        display: grid;
        grid-template-columns: 2fr 1fr;
    }
</style> -->
