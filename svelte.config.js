import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Enable TypeScript and other preprocessing
  preprocess: vitePreprocess(),

  kit: {
    // Static adapter for deployment (similar to current Vite build)
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: '200.html', // SPA fallback for unprerendered routes
      precompress: false,
      strict: false // Allow gitignored static files (content is generated)
    }),

    paths: {
      relative: false // Force absolute asset paths — required for deep URLs served via SPA fallback
    },

    prerender: {
      handleHttpError: 'warn', // Content may have broken internal links — warn instead of failing
      handleMissingId: 'warn' // A handful of cross-chapter anchor refs (e.g. "viðauka A") aren't resolvable yet — needs a book-wide id map in the CNXML renderer (tracked in namsbokasafn-efni)
    },

    // Path aliases (same as current React setup)
    alias: {
      '$lib': 'src/lib',
      '$lib/*': 'src/lib/*'
    }
  }
};

export default config;
