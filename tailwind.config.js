/** @type {import('tailwindcss').Config} */
export default {
  // PERFORMANCE FIX: Only scan these specific paths
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'print': { 'raw': 'print' },
      }
    },
  },
  plugins: [],
}