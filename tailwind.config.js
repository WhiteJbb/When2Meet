/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f5f7ef',
          100: '#eaf0df',
          200: '#d7e4c5',
          300: '#b9cda0',
          400: '#94b276',
          500: '#6e8952',
          600: '#52663b',
          700: '#3f522c',
          800: '#354329',
          900: '#293422',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Apple SD Gothic Neo', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
