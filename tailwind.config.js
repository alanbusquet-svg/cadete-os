/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#09090b', // zinc-950
        surface: '#18181b',    // zinc-900
        surfaceElevated: '#27272a', // zinc-800
        border: '#27272a',     // zinc-800
      },
      minHeight: {
        touch: '52px',
      },
      minWidth: {
        touch: '52px',
      }
    },
  },
  plugins: [],
}
