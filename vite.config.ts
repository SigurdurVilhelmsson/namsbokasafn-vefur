import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { runtimeCaching } from './src/lib/sw/runtimeCaching';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			// Service worker registration strategy
			registerType: 'prompt', // Show update prompt to user
			injectRegister: null, // We'll handle registration manually
			// Ensure SW is registered from root, not relative to current path
			scope: '/',
			base: '/',

			// Workbox configuration
			workbox: {
				// Precache essential app shell
				globPatterns: ['client/**/*.{js,css,html,ico,png,svg,woff,woff2}'],
				// MathJax bundle pushes chunks above default 2MB limit
				maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
				// Exclude server, prerendered, and static content dirs from precache.
				// prerendered/** warns "no files matched" in SPA mode — expected, harmless.
				globIgnores: ['server/**', '**/prerendered/**', '**/content/**'],

				// Runtime caching for book content: routes, limits and the downloaded-book
				// fallback live in src/lib/sw/runtimeCaching.ts (read its header first).
				runtimeCaching,

				// Don't fallback on document based (non-cached) requests
				navigateFallback: null
			},

			// Development options
			devOptions: {
				enabled: true, // Enable PWA in dev mode for testing
				type: 'module',
				navigateFallback: '/'
			},

			// Web app manifest
			manifest: {
				name: 'Námsbókasafn - Íslenskar kennslubækur',
				short_name: 'Námsbókasafn',
				description: 'Gagnvirkt námsefni fyrir íslenskar þýðingar á OpenStax kennslubókum',
				theme_color: '#c78c20',
				background_color: '#f7f4ef',
				display: 'standalone',
				orientation: 'portrait-primary',
				scope: '/',
				start_url: '/',
				lang: 'is',
				categories: ['education', 'books'],
				icons: [
					{
						src: '/icons/icon-192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any'
					},
					{
						src: '/icons/icon-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: '/icons/icon-192.svg',
						sizes: 'any',
						type: 'image/svg+xml',
						purpose: 'any'
					}
				]
			}
		})
	],
	// Same optimizations as current React setup
	build: {
		target: 'es2020',
		minify: 'esbuild'
	},
	// Preview server configuration for SPA fallback
	preview: {
		port: 4173
	}
});
