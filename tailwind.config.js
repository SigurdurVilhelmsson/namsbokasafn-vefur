/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light mode colors
        light: {
          bg: '#faf8f5',
          'bg-secondary': '#ffffff',
          text: '#1a1a1a',
          'text-secondary': '#4a5568',
          border: '#e2e8f0',
          accent: '#2563eb',
          'accent-hover': '#1e40af',
        },
        // Dark mode colors
        dark: {
          bg: '#1a1a2e',
          'bg-secondary': '#16213e',
          text: '#e2e8f0',
          'text-secondary': '#94a3b8',
          border: '#334155',
          accent: '#3b82f6',
          'accent-hover': '#60a5fa',
        },
      },
      fontFamily: {
        serif: ['Source Serif Pro', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      maxWidth: {
        'reading': '720px',
      },
      lineHeight: {
        'reading': '1.7',
      },
    },
  },
  plugins: [],
}
