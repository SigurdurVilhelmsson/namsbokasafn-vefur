import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'icons/*.png', 'covers/*.jpg'],
      manifest: false, // Using public/manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Runtime caching for content
        runtimeCaching: [
          {
            // Content JSON files (TOC, glossary)
            urlPattern: /\/content\/.*\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'content-json',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Markdown section files
            urlPattern: /\/content\/.*\.md$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'content-markdown',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Content images
            urlPattern: /\/content\/.*\.(jpg|jpeg|png|webp|gif)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'content-images',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Book covers
            urlPattern: /\/covers\/.*\.(jpg|jpeg|png|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'book-covers',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
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
