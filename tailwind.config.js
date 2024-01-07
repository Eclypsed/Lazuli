const defaultTheme = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{html,js,svelte,ts}'],
    theme: {
        extend: {
            fontFamily: {
                notoSans: ["'Noto Sans', 'Noto Sans HK', 'Noto Sans JP', 'Noto Sans KR', 'Noto Sans SC', 'Noto Sans TC'", ...defaultTheme.fontFamily.sans],
            },
            colors: {
                'lazuli-primary': '#ed6713',
                'neutral-925': 'rgb(16, 16, 16)',
                'jellyfin-purple': '#aa5cc3',
                'jellyfin-blue': '#00a4dc',
            },
        },
    },
    plugins: [],
}
