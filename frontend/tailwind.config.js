/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f0faf2',
          100: '#dbf4e3',
          200: '#b9eac8',
          300: '#87d89e',
          400: '#50be72',
          500: '#2da151',
          600: '#1f823e',
          700: '#1b6733',
          800: '#19522b',
          900: '#164425',
          950: '#0b2614',
        },
      },
    },
  },
  plugins: [],
}
