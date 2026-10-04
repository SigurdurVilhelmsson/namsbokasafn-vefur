/**
 * Service-worker runtime caching for book content, shared by vite.config.ts (which
 * hands it to workbox's generateSW), the offline store and the tests.
 *
 * ⚠️ workbox-build SERIALIZES every function below into build/sw.js with
 * `fn.toString()`. Two rules, each pinned by runtimeCaching.test.ts and by
 * e2e/offline.spec.ts reading the emitted sw.js:
 *  - arrow functions only — method shorthand is emitted as `k: async k(){}`, a
 *    SyntaxError in the service worker;
 *  - no identifier from outside the function body — a closure is emitted as a bare
 *    name, a ReferenceError in the service worker. Literals are repeated inline, and
 *    the test checks they still equal the constants exported here.
 *
 * Design and measurements: docs/plans/2026-10-04-sw-cache-and-offline-download.md.
 */

/** Pages and JSON of a book. `$`-anchored: a URL with a query never matches. */
export const CONTENT_ROUTE = /^.*\/content\/.*\.(html|md|json)$/;
/** Figures of a book. `$`-anchored: a URL with a query never matches. */
export const IMAGE_ROUTE = /^.*\/content\/.*\.(png|jpg|jpeg|gif|svg|webp)$/;

/**
 * Appended by the offline download so its fetches match neither route above and go
 * straight to the network: a book's download must never pass through (and be
 * evicted from) the capped browsing caches.
 */
export const OFFLINE_BYPASS_QUERY = 'nb-offline=1';

export const CONTENT_CACHE = 'book-content';
/**
 * Name kept from the old CacheFirst rule on purpose: frozen books' pages still run
 * the old offline code, which writes here by name, and here those writes age out.
 */
export const BROWSE_IMAGE_CACHE = 'book-images';
/** A downloaded book lives in `offline-book:<slug>`, which nothing expires. */
export const OFFLINE_CACHE_PREFIX = 'offline-book:';
/** A figure larger than this is never kept in the browsing cache (decoded bytes). */
export const BROWSE_IMAGE_MAX_BYTES = 1048576;

/**
 * Message the page posts to the active service worker to ask whether it serves
 * downloaded books (static/sw-offline-book.js answers; an older worker does not).
 */
export const OFFLINE_CAPS_MESSAGE = 'NB_OFFLINE_BOOK_CAPS';

/** The downloaded-book cache of `bookSlug`. */
export const offlineCacheName = (bookSlug: string): string => `${OFFLINE_CACHE_PREFIX}${bookSlug}`;

/**
 * `cacheWillUpdate`: keep a figure only if it is a real 200 image of at most
 * 1 MiB. nginx answers a missing figure with the SPA shell (`/200.html`, status 200,
 * text/html), and gzips SVG with no Content-Length, so the body is measured. A
 * figure re-rendered to more than 1 MiB also drops its older, smaller entry, which
 * StaleWhileRevalidate would otherwise keep serving until it expired.
 */
export const sizeGatePlugin = {
	cacheWillUpdate: async ({ request, response }: { request: Request; response: Response }) => {
		if (!response || response.status !== 200) return null;
		if ((response.headers.get('content-type') || '').includes('text/html')) return null;
		const declared = Number(response.headers.get('content-length'));
		const size =
			declared > 0 && !response.headers.get('content-encoding')
				? declared
				: (await response.clone().blob()).size;
		if (size <= 1048576) return response;
		await (await caches.open('book-images')).delete(request, { ignoreVary: true });
		return null;
	}
};

/**
 * Pages and JSON — `cachedResponseWillBeUsed`: when NetworkFirst falls back to the
 * cache (network failed or timed out) and the browsing cache misses, or its entry
 * has expired (ExpirationPlugin, which must run BEFORE this, returns null), serve
 * the copy from the book's downloaded cache. NetworkFirst only reads the cache after
 * the network failed, so an online reader still gets the network copy.
 */
export const offlineFallbackPlugin = {
	cachedResponseWillBeUsed: async ({
		request,
		cachedResponse
	}: {
		request: Request;
		cachedResponse?: Response | null;
	}) => {
		if (cachedResponse) return cachedResponse;
		const match = /^\/content\/([^/]+)\//.exec(new URL(request.url).pathname);
		if (!match) return null;
		const hit = await caches.match(request.url, {
			cacheName: 'offline-book:' + match[1],
			ignoreSearch: true,
			ignoreVary: true
		});
		return hit || null;
	}
};

/**
 * Figures — `handlerDidError`: only when StaleWhileRevalidate has neither a
 * browsing-cache entry nor a network response (offline), serve the downloaded copy.
 * Not `cachedResponseWillBeUsed`: StaleWhileRevalidate treats whatever that returns
 * as a cache hit, so an ONLINE reader who had downloaded the book would be served
 * the downloaded copy on every browsing-cache miss — forever, for a figure over the
 * size gate — and never see a re-rendered figure (review of 2026-10-04, measured).
 */
export const offlineImageFallbackPlugin = {
	handlerDidError: async ({ request }: { request: Request }) => {
		const match = /^\/content\/([^/]+)\//.exec(new URL(request.url).pathname);
		if (!match) return undefined;
		const hit = await caches.match(request.url, {
			cacheName: 'offline-book:' + match[1],
			ignoreSearch: true,
			ignoreVary: true
		});
		return hit || undefined;
	}
};

const DAY = 60 * 60 * 24;

/**
 * KEY ORDER IS PLUGIN ORDER: workbox-build emits `cacheableResponse` and
 * `expiration` as plugins where their keys sit, then `plugins` — so the fallback
 * runs after ExpirationPlugin (workbox-build runtime-caching-converter.js).
 */
export const runtimeCaching = [
	{
		// NetworkFirst: a deploy's pages are seen on the next load. `no-cache` makes the
		// browser revalidate instead of answering from its HTTP cache for 24 h
		// (nginx sends max-age=86400).
		urlPattern: CONTENT_ROUTE,
		handler: 'NetworkFirst' as const,
		options: {
			cacheName: CONTENT_CACHE,
			networkTimeoutSeconds: 3,
			fetchOptions: { cache: 'no-cache' as RequestCache },
			matchOptions: { ignoreVary: true },
			cacheableResponse: { statuses: [200] },
			expiration: { maxEntries: 500, maxAgeSeconds: 30 * DAY, purgeOnQuotaError: true },
			plugins: [offlineFallbackPlugin]
		}
	},
	{
		// StaleWhileRevalidate: a figure shows at once from the cache and is refreshed
		// in the background, so a figure re-rendered under the same name is fresh from
		// the SECOND view on (the old CacheFirst rule kept it for 30 days).
		urlPattern: IMAGE_ROUTE,
		handler: 'StaleWhileRevalidate' as const,
		options: {
			cacheName: BROWSE_IMAGE_CACHE,
			fetchOptions: { cache: 'no-cache' as RequestCache },
			matchOptions: { ignoreVary: true },
			expiration: { maxEntries: 100, maxAgeSeconds: 7 * DAY, purgeOnQuotaError: true },
			plugins: [sizeGatePlugin, offlineImageFallbackPlugin]
		}
	}
];
