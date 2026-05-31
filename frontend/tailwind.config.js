/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pokemon: {
          red: '#ff1f1f',
          blue: '#3b4cca',
          yellow: '#ffde00',
          gold: '#b3a125'
        }
      }
    },
  },
  plugins: [],
}
