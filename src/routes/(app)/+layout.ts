import type { LayoutLoad } from './$types'

export interface Tab {
    type: 'nav' | 'playlist'
    pathname: string
    name: string
    icon: string
    button?: HTMLButtonElement
}

export const load: LayoutLoad = () => {
    const navTabs: Tab[] = [
        {
            type: 'nav',
            pathname: '/',
            name: 'Home',
            icon: 'fa-solid fa-house',
        },
        {
            type: 'nav',
            pathname: '/user',
            name: 'User',
            icon: 'fa-solid fa-user', // This would be a cool spot for a user-uploaded pfp
        },
        {
            type: 'nav',
            pathname: '/search',
            name: 'Search',
            icon: 'fa-solid fa-search',
        },
        {
            type: 'nav',
            pathname: '/library',
            name: 'Libray',
            icon: 'fa-solid fa-bars-staggered',
        },
    ]

    const playlistTabs: Tab[] = [
        {
            type: 'playlist',
            pathname: '/library?playlist=AD:TRANCE 10',
            name: 'AD:TRANCE 10',
            icon: 'https://www.diverse.direct/wp/wp-content/uploads/470_artwork.jpg',
        },
        {
            type: 'playlist',
            pathname: '/library?playlist=Fionaredica',
            name: 'Fionaredica',
            icon: 'https://f4.bcbits.com/img/a2436961975_10.jpg',
        },
        {
            type: 'playlist',
            pathname: '/library?playlist=Machinate',
            name: 'Machinate',
            icon: 'https://f4.bcbits.com/img/a3587136348_10.jpg',
        },
        {
            type: 'playlist',
            pathname: '/library?playlist=MAGGOD',
            name: 'MAGGOD',
            icon: 'https://f4.bcbits.com/img/a3641603617_10.jpg',
        },
        {
            type: 'playlist',
            pathname: '/library?playlist=The Requiem',
            name: 'The Requiem',
            icon: 'https://f4.bcbits.com/img/a2458067285_10.jpg',
        },
        {
            type: 'playlist',
            pathname: '/library?playlist=IRREPARABLE HARDCORE IS BACK 2 -Horai Gekka-',
            name: 'IRREPARABLE HARDCORE IS BACK 2 -Horai Gekka-',
            icon: 'https://f4.bcbits.com/img/a1483629734_10.jpg',
        },
        {
            type: 'playlist',
            pathname: '/library?playlist=妄殺オタクティクス',
            name: '妄殺オタクティクス',
            icon: 'https://f4.bcbits.com/img/a1653481367_10.jpg',
        },
        {
            type: 'playlist',
            pathname: '/library?playlist=Collapse',
            name: 'Collapse',
            icon: 'https://f4.bcbits.com/img/a0524413952_10.jpg',
        },
    ]

    return { tabs: navTabs.concat(playlistTabs) }
}
