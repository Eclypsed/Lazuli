import type { LayoutLoad } from './$types'

export interface Tab {
    type: 'nav' | 'playlist'
    pathname: string
    name: string
    icon: string
    button?: HTMLButtonElement
}

export const load: LayoutLoad = ({ url }) => {
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
    ]

    return { tabs: navTabs.concat(playlistTabs) }
}
