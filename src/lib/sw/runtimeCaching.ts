/**
 * Service-worker runtime caching for book content, and the matcher for the route that boots
 * the app offline when a page load fails (the offline cold start). The worker's routes
 * (routes.ts) build on these; the app's offline store imports the names and constants, so this
 * file imports no workbox module.
 *
 * The worker is bundled from source (worker.ts, vite.config.ts `buildSW`), so these functions
 * run there as ordinary code: closures and module constants work.
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
 * downloaded books (messages.ts answers; an older worker does not).
 */
export const OFFLINE_CAPS_MESSAGE = 'NB_OFFLINE_BOOK_CAPS';

/**
 * The SPA shell (adapter-static's `fallback` in vite.config.ts), precached by vite.config.ts
 * (`kit.spa`) so the worker can boot the app offline.
 */
export const APP_SHELL_FILE = '200.html';

/**
 * Route matcher for the offline cold start: a same-origin page load (`navigate`)
 * of an app page. Left out: `/print/` (the PDF routes, never read offline),
 * `/content/` and `/downloads/` (raw files), and any path whose last segment has a
 * dot (`/sitemap.xml`, a PDF): an app page ends in `/` (trailingSlash 'always'),
 * and the app shell answering a file would show "Síða fannst ekki" for a file
 * that exists, where the browser's own offline page tells the truth.
 */
export const appShellNavigation = ({
	request,
	url,
	sameOrigin
}: {
	request: Request;
	url: URL;
	sameOrigin: boolean;
}) =>
	request.mode === 'navigate' &&
	sameOrigin &&
	!/^\/(?:print|content|downloads)(?:\/|$)/.test(url.pathname) &&
	!/\.[^/]*$/.test(url.pathname);

/** The downloaded-book cache of `bookSlug`. */
export const offlineCacheName = (bookSlug: string): string => `${OFFLINE_CACHE_PREFIX}${bookSlug}`;

/** The downloaded copy of a book file, from the cache of the book its /content/ URL names. */
async function downloadedCopy(request: Request): Promise<Response | undefined> {
	const book = /^\/content\/([^/]+)\//.exec(new URL(request.url).pathname)?.[1];
	if (!book) return undefined;
	return caches.match(request.url, { cacheName: offlineCacheName(book), ignoreSearch: true, ignoreVary: true });
}

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
		if (size <= BROWSE_IMAGE_MAX_BYTES) return response;
		await (await caches.open(BROWSE_IMAGE_CACHE)).delete(request, { ignoreVary: true });
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
		return (await downloadedCopy(request)) || null;
	}
};

/**
 * Figures and a downloaded book. Two jobs, one plugin:
 *
 * - `handlerDidError`: only when StaleWhileRevalidate has neither a browsing-cache
 *   entry nor a network response, serve the downloaded copy. Not
 *   `cachedResponseWillBeUsed`: StaleWhileRevalidate treats whatever that returns as
 *   a cache hit, so an ONLINE reader who had downloaded the book would be served the
 *   downloaded copy on every browsing-cache miss — forever, for a figure over the
 *   size gate — and never see a re-rendered figure (review of 2026-10-04, measured).
 * - `requestWillFetch` / `fetchDidSucceed` / `fetchDidFail`: StaleWhileRevalidate has
 *   no network timeout, so on a stalled connection (open, but nothing arrives) a
 *   figure of a downloaded book would hang instead of falling back. When a
 *   downloaded copy exists, the request is aborted if no response HEADERS arrive
 *   within 4 s (pages fall back after 3 s, NetworkFirst's networkTimeoutSeconds).
 *   The timer is cleared as soon as headers arrive, so a large figure that is
 *   genuinely downloading is never cut off. Without a downloaded copy nothing is
 *   aborted. `state` is workbox's per-request plugin state.
 */
export const offlineImageFallbackPlugin = {
	requestWillFetch: async ({ request, state }: { request: Request; state?: { timer?: number } }) => {
		if (!state || !(await downloadedCopy(request))) return request;
		const controller = new AbortController();
		state.timer = setTimeout(() => controller.abort(), 4000) as unknown as number;
		return new Request(request, { signal: controller.signal });
	},
	fetchDidSucceed: async ({ response, state }: { response: Response; state?: { timer?: number } }) => {
		clearTimeout(state?.timer);
		return response;
	},
	fetchDidFail: async ({ state }: { state?: { timer?: number } }) => {
		clearTimeout(state?.timer);
	},
	handlerDidError: async ({ request }: { request: Request }) => (await downloadedCopy(request)) || undefined
};
