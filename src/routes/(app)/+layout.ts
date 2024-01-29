import type { LayoutLoad } from './$types'
import type { NavTab } from '$lib/components/navbar/navTab.svelte'
import type { PlaylistTab } from '$lib/components/navbar/playlistTab.svelte'

export const load: LayoutLoad = () => {
    const navTabs: NavTab[] = [
        {
            pathname: '/',
            name: 'Home',
            icon: 'fa-solid fa-house',
        },
        {
            pathname: '/user',
            name: 'User',
            icon: 'fa-solid fa-user', // This would be a cool spot for a user-uploaded pfp
        },
        {
            pathname: '/search',
            name: 'Search',
            icon: 'fa-solid fa-search',
        },
        {
            pathname: '/library',
            name: 'Libray',
            icon: 'fa-solid fa-bars-staggered',
        },
    ]

    const playlistTabs: PlaylistTab[] = [
        {
            id: 'AD:TRANCE 10',
            name: 'AD:TRANCE 10',
            thumbnail: 'https://www.diverse.direct/wp/wp-content/uploads/470_artwork.jpg',
        },
        {
            id: 'Fionaredica',
            name: 'Fionaredica',
            thumbnail: 'https://f4.bcbits.com/img/a2436961975_10.jpg',
        },
        {
            id: 'Machinate',
            name: 'Machinate',
            thumbnail: 'https://f4.bcbits.com/img/a3587136348_10.jpg',
        },
        {
            id: 'MAGGOD',
            name: 'MAGGOD',
            thumbnail: 'https://f4.bcbits.com/img/a3641603617_10.jpg',
        },
        {
            id: 'The Requiem',
            name: 'The Requiem',
            thumbnail: 'https://f4.bcbits.com/img/a2458067285_10.jpg',
        },
        {
            id: 'IRREPARABLE HARDCORE IS BACK 2 -Horai Gekka-',
            name: 'IRREPARABLE HARDCORE IS BACK 2 -Horai Gekka-',
            thumbnail: 'https://f4.bcbits.com/img/a1483629734_10.jpg',
        },
        {
            id: '妄殺オタクティクス',
            name: '妄殺オタクティクス',
            thumbnail: 'https://f4.bcbits.com/img/a1653481367_10.jpg',
        },
        {
            id: 'Collapse',
            name: 'Collapse',
            thumbnail: 'https://f4.bcbits.com/img/a0524413952_10.jpg',
        },
        {
            id: 'Fleurix',
            name: 'Fleurix',
            thumbnail: 'https://f4.bcbits.com/img/a1856993876_10.jpg',
        },
        {
            id: '天​才​失​格 -No Longer Prodigy-',
            name: '天​才​失​格 -No Longer Prodigy-',
            thumbnail: 'https://f4.bcbits.com/img/a2186643420_10.jpg',
        },
    ]

    return { navTabs, playlistTabs }
}
