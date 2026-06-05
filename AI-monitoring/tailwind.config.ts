import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      colors: {
        brand: {
          yellow: '#F5C842',
          amber: '#E6A817',
          dark: '#1A1400',
          charcoal: '#2C2400',
        },
      },
    },
  },
  plugins: [],
}
export default config
