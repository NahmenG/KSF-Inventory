/** @type {import('tailwindcss').Config} */
export default {
  // 1. Performance Fix: Ensure this points ONLY to your actual source files.
  // If this accidentally includes 'node_modules', your app will load very slowly.
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 2. Custom Dimensions: Add your exact label size here
      spacing: {
        'label-w': '2.4in',
        'label-h': '3.9in',
      },
      // 3. Print Screen: Adds a 'print:' modifier if it doesn't exist by default
      screens: {
        'print': { 'raw': 'print' },
      }
    },
  },
  plugins: [],
}