import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { withPwa } from '@vite-pwa/sveltekit';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { APP_SHELL_FILE } from './src/lib/sw/runtimeCaching';

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
				// Our own worker source (src/lib/sw/worker.ts), bundled with the workbox modules it
				// imports; the precache manifest is injected at self.__WB_MANIFEST.
				strategies: 'buildSW',
				// Without it buildSW names the output after the source (worker.js). deploy.js
				// and the tests read /sw.js, and readers' installed workers are registered there.
				filename: 'sw.js',
				// Unminified, so scripts/deploy.js can read the precacheAndRoute([...]) call and
				// refuse a build whose precache lists a file the build lacks (minified, the call
				// is renamed and the check fails closed).
				minify: false,
				// Service worker registration strategy
				registerType: 'prompt', // Show update prompt to user
				injectRegister: false, // We'll handle registration manually
				// Ensure SW is registered from root, not relative to current path
				scope: '/',
				base: '/',
				// MathJax bundle pushes chunks above the default 2MB limit (top level in 2.x)
				maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
				// Precache the SPA shell that adapter-static writes (adapter options above), with a
				// revision: the adapter runs after the worker is built, so `spa` derives it from
				// _app/version.json, which changes with every build. The page-load route in
				// src/lib/sw/routes.ts serves it only when a page load fails offline. The plugin
				// applies these to the build only; the dev worker (`npm run dev`) must not precache
				// the shell, which the dev server answers with a 404 (src/lib/sw/devWorker.test.ts).
				kit: { adapterFallback: APP_SHELL_FILE, spa: true },
	
				// What buildSW bundles and precaches. The routes, the downloaded-book fallback and the
				// messages the worker answers are code in src/lib/sw/ (worker.ts, routes.ts). No
				// navigateFallback exists in this strategy: a page load offline gets the shell only
				// through the page-load route in routes.ts, when the network fails.
				buildSW: {
					swSrc: 'src/lib/sw/worker.ts',
					// Precache essential app shell
					globPatterns: ['client/**/*.{js,css,html,ico,png,svg,woff,woff2}'],
					// Exclude server, prerendered, and static content dirs from precache.
					globIgnores: ['server/**', '**/prerendered/**', '**/content/**'],
					// The plugin appends its own prerendered/** glob, which the ignores above empty on
					// purpose (no section page is precached). 2.x makes an empty glob an error; false
					// makes it a warning, as 1.x did. e2e/offline-cold-start.spec.ts checks the precache.
					globStrict: false
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
});
