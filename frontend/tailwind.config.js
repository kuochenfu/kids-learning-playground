/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF6B6B',
          light: '#FF8787',
          dark: '#E03131',
        },
        secondary: {
          DEFAULT: '#4ECDC4',
          light: '#72D9D2',
          dark: '#38B2AC',
        },
        accent: {
          DEFAULT: '#FFE66D',
          light: '#FFF08E',
          dark: '#FBD38D',
        },
        playful: {
          blue: '#A0D1FF',
          purple: '#B794F4',
          green: '#9AE6B4',
          pink: '#FBB6CE',
        },
        background: '#F8FAFC',
        card: '#FFFFFF',
        text: '#2D3436',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'playful': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'popping': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
}
