<script lang="ts">
    import { fly, fade } from "svelte/transition";
    import { goto } from "$app/navigation";
    import { pageWidth } from "$lib/stores";
    import type { LayoutServerData } from "../$types.js";

    export let data: LayoutServerData

    const contentTabs = {
        '/': {
            header: 'Home',
            icon: 'fa-solid fa-house',
        },
        '/account': {
            header: data.user.username,
            icon: 'fa-solid fa-user',
        },
        '/search': {
            header: 'Search',
            icon: 'fa-solid fa-search',
        },
        '/library': {
            header: 'Libray',
            icon: 'fa-solid fa-bars-staggered',
        },
    }

    const pageTransitionTime: number = 200

    let previousPage = data.urlPathname
    type PageTransitionDirection = 1 | -1
    let direction: PageTransitionDirection = 1
    
    const calculateDirection = (newPage: string): void => {
        const contentLinks = Object.keys(contentTabs)
        const newPageIndex = contentLinks.indexOf(newPage)
    }
</script>