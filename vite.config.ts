import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runtimeCaching, APP_SHELL_FILE } from './src/lib/sw/runtimeCaching';

/**
 * `vite preview` serves .svelte-kit/output, not build/, so it has no /200.html:
 * adapter-static writes the SPA shell straight into build/. nginx serves
 * build/200.html as a file, and the service worker precaches it (offline cold
 * start), so preview serves it the same way, or the worker's install fails on a 404
 * and no e2e test gets a worker. Preview only; the build is unchanged.
 */
function previewAppShell(): Plugin {
	return {
		name: 'nb-preview-app-shell',
		configurePreviewServer(server) {
			const file = resolve(server.config.root, 'build', APP_SHELL_FILE);
			server.middlewares.use((req, res, next) => {
				if ((req.url ?? '').split('?')[0] !== `/${APP_SHELL_FILE}` || !existsSync(file)) return next();
				res.setHeader('content-type', 'text/html; charset=utf-8');
				res.setHeader('cache-control', 'no-cache, must-revalidate');
				res.end(readFileSync(file));
			});
		}
	};
}

export default defineConfig({
	plugins: [
		tailwindcss(),
		previewAppShell(),
		sveltekit(),
		SvelteKitPWA({
			// Service worker registration strategy
			registerType: 'prompt', // Show update prompt to user
			injectRegister: null, // We'll handle registration manually
			// Ensure SW is registered from root, not relative to current path
			scope: '/',
			base: '/',
			// Precache the SPA shell that adapter-static writes (svelte.config.js), with a
			// revision: the adapter runs after the worker is generated, so `spa` derives
			// it from _app/version.json, which changes with every build. The navigation
			// route in runtimeCaching.ts serves it only when a page load fails offline.
			kit: { adapterFallback: APP_SHELL_FILE, spa: true },

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
				// Answers the page's "do you serve downloaded books?" check (see that file).
				importScripts: ['/sw-offline-book.js'],

				// Never serve the shell in place of a page that loads: an online page load
				// must get the prerendered page. The offline fallback is a route in
				// runtimeCaching.ts that answers only when the network fails.
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
