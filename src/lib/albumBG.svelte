<script>
    export let albumImg;
</script>

<div id="album-bg-wrapper" class="w-full h-screen overflow-hidden absolute z-0">
    <div class="h-full bg-cover bg-center brightness-[30%]" style="background-image: url({albumImg});" draggable="false"/>
    <div class="bg-neutral-900 w-full h-full absolute top-1/2 z-10 skew-y-6"/>
</div>