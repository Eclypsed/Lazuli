<script>
    import { onMount } from "svelte";

    onMount(() => {
        window.onscroll = () => {
            const navbar = document.getElementById('navbar');
            if (window.scrollY !== 0) {
                navbar.style.backgroundColor = '#00000091';
            } else if (window.scrollY == 0) {
                navbar.style.backgroundColor = '#00000000';
            };
        };
    })
</script>

<nav id="navbar" class="w-full h-16 z-10 bg-transparent fixed transition-[background_color] ease-linear duration-300"></nav>