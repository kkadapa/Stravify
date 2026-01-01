/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#18181b', // zinc-900
                surface: '#27272a',    // zinc-800
                primary: '#f97316',    // orange-500
                secondary: '#a1a1aa',  // zinc-400
            }
        },
    },
    plugins: [],
}
