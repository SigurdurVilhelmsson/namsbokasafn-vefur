/**
 * The service worker's routes (routes.ts), built from the same workbox classes the worker
 * bundles. A strategy runs its plugins in list order, so these tests read the lists the worker
 * registers: on the pages route the downloaded-book fallback must come after ExpirationPlugin,
 * or an expired browsing-cache entry hides the downloaded copy (the kit 3 trial's trap 2, which
 * the generator's key order could not be trusted to keep).
 */
import { describe, it, expect } from 'vitest';
import { NetworkFirst, NetworkOnly, StaleWhileRevalidate } from '@vite-pwa/workbox-swkit/strategies';
import { ExpirationPlugin } from '@vite-pwa/workbox-swkit/expiration';
import { CacheableResponsePlugin } from '@vite-pwa/workbox-swkit/cacheable-response';
import { PrecacheFallbackPlugin } from '@vite-pwa/workbox-swkit/precaching';
import { bookRoutes } from './routes';
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

const DAY = 24 * 60 * 60;

// Workbox keeps these settings on private fields; reading them is the point of the test.
/* eslint-disable @typescript-eslint/no-explicit-any */
const strategyOf = (i: number) => bookRoutes()[i].strategy as any;
const pluginsOf = (i: number) => strategyOf(i).plugins as any[];
/* eslint-enable @typescript-eslint/no-explicit-any */

describe('the worker registers three routes', () => {
	it('pages, figures and page loads, in that order, all for GET', () => {
		expect(bookRoutes().map((route) => [route.match, route.method])).toEqual([
			[CONTENT_ROUTE, 'GET'],
			[IMAGE_ROUTE, 'GET'],
			[appShellNavigation, 'GET']
		]);
	});
});

describe('pages and JSON', () => {
	it('go to the network first, into the book-content cache, giving up after 3 s', () => {
		const strategy = strategyOf(0);
		expect(strategy).toBeInstanceOf(NetworkFirst);
		expect(strategy.cacheName).toBe(CONTENT_CACHE);
		expect(strategy._networkTimeoutSeconds).toBe(3);
	});

	it('revalidate with the server instead of the HTTP cache, and ignore Vary', () => {
		expect(strategyOf(0).fetchOptions).toEqual({ cache: 'no-cache' });
		expect(strategyOf(0).matchOptions).toEqual({ ignoreVary: true });
	});

	it('cache only a 200 answer', async () => {
		const cacheable = pluginsOf(0)[0];
		expect(cacheable).toBeInstanceOf(CacheableResponsePlugin);
		const ok = new Response('page', { status: 200 });
		expect(await cacheable.cacheWillUpdate({ response: ok })).toBe(ok);
		expect(await cacheable.cacheWillUpdate({ response: new Response('', { status: 404 }) })).toBeNull();
	});

	it('expire after 500 entries or 30 days, and when storage runs out', () => {
		const expiration = pluginsOf(0)[1];
		expect(expiration).toBeInstanceOf(ExpirationPlugin);
		expect(expiration._config).toEqual({ maxEntries: 500, maxAgeSeconds: 30 * DAY, purgeOnQuotaError: true });
	});

	it('fall back to the downloaded book last, after expiration', () => {
		expect(pluginsOf(0)).toHaveLength(3);
		expect(pluginsOf(0)[2]).toBe(offlineFallbackPlugin);
	});
});

describe('figures', () => {
	it('show the cached copy and refresh it in the background, into the book-images cache', () => {
		const strategy = strategyOf(1);
		expect(strategy).toBeInstanceOf(StaleWhileRevalidate);
		expect(strategy.cacheName).toBe(BROWSE_IMAGE_CACHE);
	});

	it('revalidate with the server instead of the HTTP cache, and ignore Vary', () => {
		expect(strategyOf(1).fetchOptions).toEqual({ cache: 'no-cache' });
		expect(strategyOf(1).matchOptions).toEqual({ ignoreVary: true });
	});

	it('expire after 100 entries or 7 days, and when storage runs out', () => {
		const expiration = pluginsOf(1)[0];
		expect(expiration).toBeInstanceOf(ExpirationPlugin);
		expect(expiration._config).toEqual({ maxEntries: 100, maxAgeSeconds: 7 * DAY, purgeOnQuotaError: true });
	});

	it('pass the size gate, then fall back to the downloaded copy', () => {
		expect(pluginsOf(1)).toHaveLength(3);
		expect(pluginsOf(1)[1]).toBe(sizeGatePlugin);
		expect(pluginsOf(1)[2]).toBe(offlineImageFallbackPlugin);
	});

	// StaleWhileRevalidate treats a cachedResponseWillBeUsed result as a cache hit, so an
	// ONLINE reader would get the downloaded copy instead of a re-rendered figure. (Workbox's
	// own ExpirationPlugin has that hook too: it is how an expired entry is dropped.)
	it('never answer a cache miss from the downloaded copy', () => {
		const ours = pluginsOf(1).filter((plugin) => !(plugin instanceof ExpirationPlugin));
		expect(ours).toHaveLength(2);
		expect(ours.some((plugin) => 'cachedResponseWillBeUsed' in plugin)).toBe(false);
	});
});

describe('page loads (the offline cold start)', () => {
	it('go to the network, and only a failed load gets the precached shell', () => {
		const strategy = strategyOf(2);
		expect(strategy).toBeInstanceOf(NetworkOnly);
		expect(pluginsOf(2)).toHaveLength(1);
		expect(pluginsOf(2)[0]).toBeInstanceOf(PrecacheFallbackPlugin);
		expect(pluginsOf(2)[0]._fallbackURL).toBe(`/${APP_SHELL_FILE}`);
	});
});
