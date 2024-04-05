<script lang="ts">
    export let currentlyPlaying: Song
</script>

<main class="h-full w-full">
    <div class="bg-red-300">
        <audio controls>
            <source src="/api/audio?id=KfmrhlGCfWk&connectionId=cae88864-e116-4ce8-b3cc-5383eae0b781&apikey=2ff052272eeb44628c97314e09f384c10ae7fb31d8a40630442d3cb417512574" type="audio/webm" />
        </audio>
    </div>
    <div class="bg-green-300">{currentlyPlaying.type}</div>
</main>

<style>
    main {
        display: grid;
        grid-template-columns: 2fr 1fr;
    }
</style>
