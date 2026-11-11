/**
 * The service worker's routes: what the worker (worker.ts) registers, in this order. The
 * matchers, cache names and plugins live in runtimeCaching.ts, which the app's offline store
 * imports too; this file adds the workbox classes, so only the worker and its tests import it.
 *
 * A strategy runs its plugins in list order. On the pages route the downloaded-book fallback
 * comes after ExpirationPlugin, which returns null for an expired entry, so the fallback sees
 * that null and serves the downloaded copy instead (routes.test.ts).
 */
import { CacheableResponsePlugin } from '@vite-pwa/workbox-swkit/cacheable-response';
import { ExpirationPlugin } from '@vite-pwa/workbox-swkit/expiration';
import { PrecacheFallbackPlugin } from '@vite-pwa/workbox-swkit/precaching';
import type { RouteMatchCallback } from '@vite-pwa/workbox-swkit/core/types';
import { NetworkFirst, NetworkOnly, StaleWhileRevalidate, type Strategy } from '@vite-pwa/workbox-swkit/strategies';
import {
	APP_SHELL_FILE,
	BROWSE_IMAGE_CACHE,
	CONTENT_CACHE,
	CONTENT_ROUTE,
	IMAGE_ROUTE,
	appShellNavigation,
	offlineFallbackPlugin,
	offlineImageFallbackPlugin,
	sizeGatePlugin
} from './runtimeCaching';

export interface BookRoute {
	match: RegExp | RouteMatchCallback;
	strategy: Strategy;
	method: 'GET';
}

const DAY = 24 * 60 * 60;

export function bookRoutes(): BookRoute[] {
	return [
		{
			// NetworkFirst: a deploy's pages are seen on the next load. `no-cache` makes the
			// browser revalidate instead of answering from its HTTP cache for 24 h (nginx
			// sends max-age=86400).
			match: CONTENT_ROUTE,
			strategy: new NetworkFirst({
				cacheName: CONTENT_CACHE,
				networkTimeoutSeconds: 3,
				fetchOptions: { cache: 'no-cache' },
				matchOptions: { ignoreVary: true },
				plugins: [
					new CacheableResponsePlugin({ statuses: [200] }),
					new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 30 * DAY, purgeOnQuotaError: true }),
					offlineFallbackPlugin
				]
			}),
			method: 'GET'
		},
		{
			// StaleWhileRevalidate: a figure shows at once from the cache and is refreshed in
			// the background, so a figure re-rendered under the same name is fresh from the
			// SECOND view on.
			match: IMAGE_ROUTE,
			strategy: new StaleWhileRevalidate({
				cacheName: BROWSE_IMAGE_CACHE,
				fetchOptions: { cache: 'no-cache' },
				matchOptions: { ignoreVary: true },
				plugins: [
					new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * DAY, purgeOnQuotaError: true }),
					sizeGatePlugin,
					offlineImageFallbackPlugin
				]
			}),
			method: 'GET'
		},
		{
			// Offline cold start: a page load goes to the network exactly as with no route
			// (NetworkOnly stores nothing, and an answer the server gives, a 404 included, is
			// passed on). Only when the network FAILS does PrecacheFallbackPlugin answer with
			// the precached SPA shell, which boots the app; its loaders then read toc.json and
			// the section through the routes above, and so from a downloaded book. Never a
			// NavigationRoute (navigateFallback), which serves the shell for every page load,
			// online too, in place of the prerendered page.
			match: appShellNavigation,
			strategy: new NetworkOnly({ plugins: [new PrecacheFallbackPlugin({ fallbackURL: `/${APP_SHELL_FILE}` })] }),
			method: 'GET'
		}
	];
}
