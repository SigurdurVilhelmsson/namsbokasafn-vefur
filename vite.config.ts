import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core - rarely changes, cache long-term
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Markdown rendering - heavy, load on demand
          'markdown': [
            'react-markdown',
            'remark-gfm',
            'remark-math',
            'remark-directive',
            'rehype-katex',
            'unist-util-visit',
          ],
          // KaTeX for math - heavy, load with markdown
          'katex': ['katex'],
          // UI utilities - moderate size
          'ui-vendor': ['lucide-react', 'zustand', 'date-fns'],
        },
      },
    },
  },
})
