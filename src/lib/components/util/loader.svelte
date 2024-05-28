<!-- Credit to https://cssloaders.github.io/ -->
<script lang="ts">
    export let size = 5
</script>

<span id="loader" style="height: {size}rem; width: {size}rem;" class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />

<style>
    #loader:after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: inherit;
        height: inherit;
        border-radius: 50%;
        animation: 1s spin linear infinite;
    }

    @keyframes spin {
        0%,
        100% {
            box-shadow: 0.2rem 0;
        }
        12% {
            box-shadow: 0.2rem 0.2rem;
        }
        25% {
            box-shadow: 0 0.2rem;
        }
        37% {
            box-shadow: -0.2rem 0.2rem;
        }
        50% {
            box-shadow: -0.2rem 0;
        }
        62% {
            box-shadow: -0.2rem -0.2rem;
        }
        75% {
            box-shadow: 0 -0.2rem;
        }
        87% {
            box-shadow: 0.2rem -0.2rem;
        }
    }
</style>
