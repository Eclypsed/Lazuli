<!--
    @component
    A component that can be injected with a text to display it in a single line that clips if overflowing and intermittently scrolls
    from one end to the other. The scrolling text area is set to take up the maximum width and height that it can. Constrain the available
    scrolling area with a wrapper element.

    ```tsx
    <slot name="text" /> // An HTML element to wrap and style the text you want to scroll (e.g. div, spans, strongs)
    ```
-->

<script lang="ts">
    let slidingText: HTMLElement
    let slidingTextWidth: number, slidingTextWrapperWidth: number
    let scrollDirection: 1 | -1 = 1
    $: scrollDistance = slidingTextWidth - slidingTextWrapperWidth
    $: if (slidingText && scrollDistance > 0) slidingText.style.animationDuration = `${scrollDistance / 40}s`
</script>

<div bind:clientWidth={slidingTextWrapperWidth} class="relative h-full w-full overflow-clip">
    <span
        bind:this={slidingText}
        bind:clientWidth={slidingTextWidth}
        on:animationend={() => (scrollDirection *= -1)}
        id="scrollingText"
        class="{scrollDistance > 0 ? (scrollDirection > 0 ? 'scrollLeft' : 'scrollRight') : ''} absolute whitespace-nowrap"
    >
        <slot name="text" />
    </span>
</div>

<style>
    #scrollingText {
        animation-timing-function: linear;
        animation-fill-mode: both;
        animation-delay: 10s;
    }
    #scrollingText:hover {
        animation-play-state: paused;
    }
    .scrollLeft {
        animation-name: scrollLeft;
    }
    .scrollRight {
        animation-name: scrollRight;
    }

    @keyframes scrollLeft {
        0% {
            left: 0%;
            transform: translateX(0%);
        }
        100% {
            left: 100%;
            transform: translateX(-100%);
        }
    }

    @keyframes scrollRight {
        0% {
            left: 100%;
            transform: translateX(-100%);
        }
        100% {
            left: 0%;
            transform: translateX(0%);
        }
    }
</style>
