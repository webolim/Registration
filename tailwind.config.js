/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./admin.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        orange: {
          50: '#FFFAF0',
          100: '#FCEEB5',
          200: '#FADF7E',
          300: '#F8CF4E',
          400: '#F4BD25',
          500: '#DAA520',
          600: '#B8860B',
          700: '#976D07',
          800: '#765404',
          900: '#583E01',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
