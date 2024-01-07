<script>
    export let currentlyPlaying
    export let playlistItems

    import { JellyfinUtils } from '$lib/utils'
    import { onMount, createEventDispatcher } from 'svelte'
    import { fade } from 'svelte/transition'

    import ListItem from '$lib/listItem.svelte'
    import MediaControl from '$lib/mediaControl.svelte'

    const dispatch = createEventDispatcher()

    $: currentlyPlayingImageId = 'Primary' in currentlyPlaying.ImageTags ? currentlyPlaying.Id : currentlyPlaying.AlbumId
    $: currentlyPlayingImage = JellyfinUtils.getImageEnpt(currentlyPlayingImageId)

    $: audioEndpoint = JellyfinUtils.getAudioEnpt(currentlyPlaying.Id, 'default')
    let audio
    let audioVolume = 0.1
    let progressBar

    let playingState = 'paused'

    onMount(() => {
        audio = document.getElementById('audio')
        audio.volume = audioVolume
        progressBar = document.getElementById('progress-bar')

        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => playSong())
            navigator.mediaSession.setActionHandler('pause', () => pauseSong())
            navigator.mediaSession.setActionHandler('stop', () => closeMediaPlayer())
            navigator.mediaSession.setActionHandler('nexttrack', () => playNext())
            navigator.mediaSession.setActionHandler('previoustrack', () => playPrevious())
        }
    })

    $: updateAudioSrc(audioEndpoint)
    const updateAudioSrc = (newAudioEndpoint) => {
        if (!audio) {
            return onMount(() => {
                audio.src = newAudioEndpoint
                playSong()
            })
        }
        audio.src = newAudioEndpoint
        playSong()
    }

    $: updateMediaSession(currentlyPlaying)
    const updateMediaSession = (media) => {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: media.Name,
                artist: media.Artists.join(' / '),
                album: media.Album,
                artwork: [
                    {
                        src: currentlyPlayingImage + '&width=96&height=96',
                        sizes: '96x96',
                        type: 'image/png',
                    },
                    {
                        src: currentlyPlayingImage + '&width=128&height=128',
                        sizes: '128x128',
                        type: 'image/png',
                    },
                    {
                        src: currentlyPlayingImage + '&width=192&height=192',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: currentlyPlayingImage + '&width=256&height=256',
                        sizes: '256x256',
                        type: 'image/png',
                    },
                    {
                        src: currentlyPlayingImage + '&width=384&height=384',
                        sizes: '384x384',
                        type: 'image/png',
                    },
                    {
                        src: currentlyPlayingImage + '&width=512&height=512',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                ],
            })
        }
    }

    const playSong = () => {
        audio.play()
        playingState = 'playing'
    }

    const pauseSong = () => {
        audio.pause()
        playingState = 'paused'
    }

    const playNext = () => {
        let nextSong = playlistItems[playlistItems.indexOf(currentlyPlaying) + 1]
        if (nextSong) {
            dispatch('startPlayback', {
                item: nextSong,
            })
        }
    }

    const playPrevious = () => {
        let previousSong = playlistItems[playlistItems.indexOf(currentlyPlaying) - 1]
        if (previousSong) {
            dispatch('startPlayback', {
                item: previousSong,
            })
        }
    }

    const updateProgressBar = (event) => {
        if (event.target.currentTime) {
            let currentPercentage = event.target.currentTime / event.target.duration
            if (document.activeElement !== progressBar) {
                progressBar.value = currentPercentage
            }
        }
    }

    const updateAudioTime = () => {
        let audioTimeStamp = audio.duration * progressBar.value
        audio.currentTime = audioTimeStamp
    }

    const closeMediaPlayer = () => {
        dispatch('closeMediaPlayer')
    }
</script>

<div id="layout" class="grid h-full grid-cols-1 grid-rows-[3fr_2fr] lg:grid-cols-[2fr_1fr] lg:grid-rows-1">
    <div class="relative h-full overflow-hidden">
        <div class="absolute z-0 flex h-full w-full items-center justify-items-center bg-neutral-900">
            <div class="absolute z-10 h-full w-full backdrop-blur-3xl"></div>
            {#key currentlyPlaying}
                <img in:fade src={currentlyPlayingImage} alt="" class="absolute h-full w-full object-cover brightness-[70%]" />
            {/key}
        </div>
        <div class="absolute grid h-full w-full grid-rows-[auto_8rem_3rem_6rem] justify-items-center p-8">
            {#key currentlyPlaying}
                <img in:fade src={currentlyPlayingImage} alt="" class="h-full min-h-[8rem] overflow-hidden rounded-xl object-contain p-2" />
            {/key}
            <div in:fade class="flex flex-col items-center justify-center gap-1 px-8 text-center font-notoSans">
                {#key currentlyPlaying}
                    <span class="text-xl text-neutral-500">{currentlyPlaying.Album}</span>
                    <span class="text-3xl text-neutral-300">{currentlyPlaying.Name}</span>
                    <span class="text-xl text-neutral-500">{currentlyPlaying.Artists.join(' / ')}</span>
                {/key}
            </div>
            <input id="progress-bar" on:mouseup={updateAudioTime} type="range" value="0" min="0" max="1" step="any" class="w-[90%] cursor-pointer rounded-lg bg-gray-400" />
            <div class="flex h-full w-11/12 justify-around overflow-hidden">
                <MediaControl type={'previoustrack'} on:mediaControlEvent={() => playPrevious()} />
                <MediaControl type={playingState} on:mediaControlEvent={(event) => (event.detail.eventType === 'playing' ? pauseSong() : playSong())} />
                <MediaControl type={'stop'} on:mediaControlEvent={() => closeMediaPlayer()} />
                <MediaControl type={'nexttrack'} on:mediaControlEvent={() => playNext()} />
            </div>
        </div>
    </div>
    <div class="no-scrollbar flex w-full flex-col items-center divide-y-[1px] divide-[#353535] overflow-y-scroll bg-neutral-900 p-4">
        {#each playlistItems as item}
            {#if item == currentlyPlaying}
                <div class="flex w-full bg-neutral-500">
                    <ListItem {item} />
                </div>
            {:else}
                <div class="flex w-full hover:bg-neutral-500">
                    <ListItem {item} on:startPlayback />
                </div>
            {/if}
        {/each}
    </div>
    <audio id="audio" on:ended={playNext} on:timeupdate={updateProgressBar} crossorigin="anonymous" class="hidden" />
</div>
