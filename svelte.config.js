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
      fallback: 'index.html', // SPA fallback
      precompress: false,
      strict: false // Allow gitignored static files (content is generated)
    }),

    // Path aliases (same as current React setup)
    alias: {
      '$lib': 'src/lib',
      '$lib/*': 'src/lib/*'
    }
  }
};

export default config;
