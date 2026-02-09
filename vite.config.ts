import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
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
				// Exclude server and prerendered files (we use SPA mode)
				// Note: Plugin warns about prerendered/** pattern not matching files - this is
				// expected behavior for SPA-only apps. See: https://github.com/vite-pwa/sveltekit/issues/55
				globIgnores: ['server/**', '**/prerendered/**'],

				// Runtime caching for content
				runtimeCaching: [
					{
						// Cache book content (HTML, markdown, JSON) — NetworkFirst
						// so deploys are picked up immediately when online
						urlPattern: /^.*\/content\/.*\.(html|md|json)$/,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'book-content',
							expiration: {
								maxEntries: 500,
								maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
							},
							cacheableResponse: {
								statuses: [0, 200]
							},
							networkTimeoutSeconds: 3
						}
					},
					{
						// Cache images
						urlPattern: /^.*\/content\/.*\.(png|jpg|jpeg|gif|svg|webp)$/,
						handler: 'CacheFirst',
						options: {
							cacheName: 'book-images',
							expiration: {
								maxEntries: 200,
								maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},
					{
						// Cache Google Fonts
						urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'google-fonts-cache',
							expiration: {
								maxEntries: 10,
								maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},
					{
						urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'gstatic-fonts-cache',
							expiration: {
								maxEntries: 10,
								maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					}
				],

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
				theme_color: '#1a7d5c',
				background_color: '#ffffff',
				display: 'standalone',
				orientation: 'portrait-primary',
				scope: '/',
				start_url: '/',
				lang: 'is',
				categories: ['education', 'books'],
				icons: [
					{
						src: '/icons/icon-192.svg',
						sizes: '192x192',
						type: 'image/svg+xml',
						purpose: 'any'
					},
					{
						src: '/icons/icon-192.svg',
						sizes: '512x512',
						type: 'image/svg+xml',
						purpose: 'any maskable'
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
