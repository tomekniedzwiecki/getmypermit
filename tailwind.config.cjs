/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './*.html',
        './crm/**/*.html',
        './crm/**/*.js',
        './components/**/*.js',
        './tracking.js',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
        },
    },
    plugins: [],
};
