/** @type {import('tailwindcss').Config} */
export default {
  // Enable class strategy for dark mode so we can toggle via <html class="dark"> or a provider
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
