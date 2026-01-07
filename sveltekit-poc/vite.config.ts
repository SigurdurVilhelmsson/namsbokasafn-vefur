import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  // Same optimizations as current React setup
  build: {
    target: 'es2020',
    minify: 'esbuild'
  }
});
