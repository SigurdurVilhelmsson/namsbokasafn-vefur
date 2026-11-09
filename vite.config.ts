import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { withPwa } from '@vite-pwa/sveltekit';
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

export default defineConfig(({ command }) => ({
	plugins: [
		tailwindcss(),
		previewAppShell(),
		// withPwa runs sveltekit() itself, with these options (kit 3 reads no
		// svelte.config.js), and wraps the adapter so the worker is generated first.
		withPwa(
			{
				// Enable TypeScript and other preprocessing
				preprocess: vitePreprocess(),

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
					handleMissingId: 'warn', // A handful of cross-chapter anchor refs (e.g. "viðauka A") aren't resolvable yet — needs a book-wide id map in the CNXML renderer (tracked in namsbokasafn-efni)
					handleUnseenRoutes: 'warn' // Some prerenderable routes (e.g. /vidauki) yield no entries when a book has no non-interactive appendix yet; skip them instead of failing the build (they still work via the SPA fallback)
				},

				// kit 3 no longer generates $lib; this keeps it without the #lib rewrite
				alias: { $lib: 'src/lib', '$lib/*': 'src/lib/*' }
			},
			{
				// Service worker registration strategy
				registerType: 'prompt', // Show update prompt to user
				injectRegister: false, // We'll handle registration manually
				// Ensure SW is registered from root, not relative to current path
				scope: '/',
				base: '/',
				// MathJax bundle pushes chunks above the default 2MB limit (top level in 2.x)
				maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
				// TRIAL: an unminified worker keeps precacheAndRoute([...]) readable for deploy.js
				minify: false,
				// Precache the SPA shell that adapter-static writes (adapter options above), with a
				// revision: the adapter runs after the worker is generated, so `spa` derives
				// it from _app/version.json, which changes with every build. The navigation
				// route in runtimeCaching.ts serves it only when a page load fails offline.
				// Build only: `vite dev` makes its own worker from these options (devOptions),
				// and there `spa` throws before any build has run (no version.json) or
				// precaches a /200.html the dev server answers with a 404, so the dev worker
				// never installs (src/lib/sw/devWorker.test.ts).
				kit: command === 'build' ? { adapterFallback: APP_SHELL_FILE, spa: true } : {},
	
				// Workbox configuration (`generateSW`, formerly `workbox`). navigateFallback
				// must stay in THIS object: 2.x sets it to adapterFallback unless the key is here.
				generateSW: {
					// Precache essential app shell
					globPatterns: ['client/**/*.{js,css,html,ico,png,svg,woff,woff2}'],
					// Exclude server, prerendered, and static content dirs from precache.
					// prerendered/** warns "no files matched" in SPA mode — expected, harmless.
					globIgnores: ['server/**', '**/prerendered/**', '**/content/**'],
					// TRIAL: 2.x appends its own prerendered/** glob, which these ignores empty, and makes
					// an empty glob an error (1.x warned). false restores 1.x; it would also hide a real miss.
					globStrict: false,
	
					// Runtime caching for book content: routes, limits and the downloaded-book
					// fallback live in src/lib/sw/runtimeCaching.ts (read its header first).
					runtimeCaching,
					// Answers the page's "do you serve downloaded books?" check (see that file).
					// TRIAL: the workbox fork has no importScripts; the downloaded-book check is OFF until this is rebuilt.
					// importScripts: ['/sw-offline-book.js'],
	
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
			}
		)
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
}));
