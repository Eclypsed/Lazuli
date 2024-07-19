const defaultTheme = require('tailwindcss/defaultTheme')
const plugin = require('tailwindcss/plugin')

/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{html,js,svelte,ts}'],
    theme: {
        extend: {
            fontFamily: {
                notoSans: ["'Noto Sans', 'Noto Sans HK', 'Noto Sans JP', 'Noto Sans KR', 'Noto Sans SC', 'Noto Sans TC'", ...defaultTheme.fontFamily.sans],
            },
            colors: {
                'lazuli-primary': '#00a4dc',
                'neutral-925': 'rgb(16, 16, 16)',
                'jellyfin-purple': '#aa5cc3',
                'jellyfin-blue': '#00a4dc',
                'youtube-red': '#ff0000',
            },
        },
    },
    plugins: [
        plugin(function ({ addUtilities }) {
            addUtilities({
                /* Hide scrollbar for Chrome, Safari and Opera */
                '.no-scrollbar::-webkit-scrollbar': {
                    display: 'none',
                },
                /* Hide scrollbar for IE, Edge and Firefox */
                '.no-scrollbar': {
                    '-ms-overflow-style': 'none' /* IE and Edge */,
                    'scrollbar-width': 'none' /* Firefox */,
                },
            })
        }),
    ],
}
