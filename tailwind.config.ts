import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#E85D04', foreground: '#ffffff', 50: '#fff7ed', 100: '#ffedd5', 500: '#E85D04', 600: '#dc4f00', 700: '#b43f00' },
        secondary: { DEFAULT: '#1a1a2e', foreground: '#ffffff' },
      },
      fontFamily: { myanmar: ['"Noto Sans Myanmar"', 'sans-serif'] },
    },
  },
  plugins: [],
}
export default config
