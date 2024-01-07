<script>
    import { onMount } from 'svelte'

    export let data

    let videoElement
    let audioElement

    onMount(() => {
        audioElement.volume = 0.3
    })

</script>

<video controls bind:this={videoElement} preload="auto">
    <source src={data.videoUrl} type="video/mp4" />
    <track kind="captions" />
</video>
<audio controls bind:this={audioElement}
                on:play={videoElement.play()}
                on:pause={videoElement.pause()}
                on:seeked={(videoElement.currentTime = audioElement.currentTime)} preload="auto">
    <source src={data.audioUrl} type="audio/webm" />
</audio>