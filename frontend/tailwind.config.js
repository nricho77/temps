/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          dark:    '#0D1B4B',
          darker:  '#07102E',
          light:   '#1A2F6B',
          gold:    '#C9A84C',
          goldLight: '#E8C872',
          goldDark: '#A07830',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 8px 0 rgba(13,27,75,0.10)',
        'card-lg': '0 4px 24px 0 rgba(13,27,75,0.15)',
      }
    }
  },
  plugins: [],
};
