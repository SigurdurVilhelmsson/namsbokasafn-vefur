/**
 * The plugins in runtimeCaching.ts run inside the service worker as their SOURCE
 * TEXT (workbox-build serializes them with fn.toString()). So every behavioural test
 * here calls a copy rebuilt from that text in a scope with none of this module's
 * bindings: a closure over a module constant throws a ReferenceError here, exactly
 * as it would in build/sw.js. e2e/offline.spec.ts checks the real emitted sw.js.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
	runtimeCaching,
	sizeGatePlugin,
	offlineFallbackPlugin,
	offlineImageFallbackPlugin,
	BROWSE_IMAGE_CACHE,
	CONTENT_ROUTE,
	IMAGE_ROUTE,
	OFFLINE_BYPASS_QUERY,
	OFFLINE_CACHE_PREFIX,
	BROWSE_IMAGE_MAX_BYTES,
	offlineCacheName
} from './runtimeCaching';

/** Rebuild a serialized function from its source text, with no closure. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rebuilt<T extends (...args: any[]) => any>(fn: T): T {
	return new Function(`return (${fn.toString()});`)() as T;
}

const sizeGate = rebuilt(sizeGatePlugin.cacheWillUpdate);
const fallback = rebuilt(offlineFallbackPlugin.cachedResponseWillBeUsed);
const imageFallback = rebuilt(offlineImageFallbackPlugin.handlerDidError);
const FIGURE = 'http://localhost/content/b/chapters/01/x.svg';

const response = (body: string, headers: Record<string, string> = {}, status = 200) =>
	new Response(body, { status, headers: { 'content-type': 'image/svg+xml', ...headers } });

describe('size gate (serialized)', () => {
	const del = vi.fn().mockResolvedValue(true);
	beforeEach(() => {
		del.mockClear();
		vi.stubGlobal('caches', { open: vi.fn().mockResolvedValue({ delete: del }) });
	});
	afterEach(() => vi.unstubAllGlobals());
	const gate = (response: Response) => sizeGate({ request: new Request(FIGURE), response });

	it('keeps a figure of exactly the limit', async () => {
		const r = response('x'.repeat(BROWSE_IMAGE_MAX_BYTES));
		expect(await gate(r)).toBe(r);
	});

	it('drops a figure one byte over the limit when no Content-Length is sent', async () => {
		expect(await gate(response('x'.repeat(BROWSE_IMAGE_MAX_BYTES + 1)))).toBeNull();
	});

	it('drops a figure whose Content-Length is over the limit without reading it', async () => {
		expect(await gate(response('small', { 'content-length': String(5_000_000) }))).toBeNull();
	});

	it('measures the body when the response is content-encoded', async () => {
		const r = response('small', { 'content-length': String(5_000_000), 'content-encoding': 'gzip' });
		expect(await gate(r)).toBe(r);
	});

	it('drops a non-200 response', async () => {
		expect(await gate(response('gone', {}, 404))).toBeNull();
	});

	it("drops nginx's SPA shell, which answers a missing figure with 200 text/html", async () => {
		expect(await gate(response('<!doctype html>', { 'content-type': 'text/html; charset=utf-8' }))).toBeNull();
	});

	it('removes the older entry of a figure re-rendered over the limit', async () => {
		await gate(response('x'.repeat(BROWSE_IMAGE_MAX_BYTES + 1)));
		expect(del).toHaveBeenCalledWith(expect.objectContaining({ url: FIGURE }), { ignoreVary: true });
	});

	it('deletes from the browsing image cache', async () => {
		await gate(response('x'.repeat(BROWSE_IMAGE_MAX_BYTES + 1)));
		expect(vi.mocked(caches.open)).toHaveBeenCalledWith(BROWSE_IMAGE_CACHE);
	});
});

describe('downloaded-book fallback (serialized)', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('passes a cached response through untouched', async () => {
		const cached = response('cached');
		const request = new Request('http://localhost/content/b/chapters/01/x.svg');
		expect(await fallback({ request, cachedResponse: cached })).toBe(cached);
	});

	it("on a miss, reads the book's downloaded cache", async () => {
		const match = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal('caches', { match });
		const url = 'http://localhost/content/efnafraedi-2e/chapters/01/x.svg';
		await fallback({ request: new Request(url), cachedResponse: null });
		expect(match).toHaveBeenCalledWith(url, expect.objectContaining({ cacheName: 'offline-book:efnafraedi-2e' }));
	});

	it('returns the downloaded copy when there is one', async () => {
		const copy = response('downloaded');
		vi.stubGlobal('caches', { match: vi.fn().mockResolvedValue(copy) });
		const request = new Request('http://localhost/content/b/chapters/01/x.svg');
		expect(await fallback({ request, cachedResponse: null })).toBe(copy);
	});

	it('returns null outside /content/', async () => {
		vi.stubGlobal('caches', { match: vi.fn() });
		expect(await fallback({ request: new Request('http://localhost/x.svg'), cachedResponse: null })).toBeNull();
	});
});

describe('figure fallback (serialized)', () => {
	afterEach(() => vi.unstubAllGlobals());

	it("serves the book's downloaded copy when the strategy failed", async () => {
		const copy = response('downloaded');
		vi.stubGlobal('caches', { match: vi.fn().mockResolvedValue(copy) });
		expect(await imageFallback({ request: new Request(FIGURE) })).toBe(copy);
	});

	it('reads the downloaded cache of the figure’s book', async () => {
		const match = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal('caches', { match });
		await imageFallback({ request: new Request(FIGURE) });
		expect(match).toHaveBeenCalledWith(FIGURE, expect.objectContaining({ cacheName: 'offline-book:b' }));
	});

	it('gives up (undefined) when nothing was downloaded', async () => {
		vi.stubGlobal('caches', { match: vi.fn().mockResolvedValue(undefined) });
		expect(await imageFallback({ request: new Request(FIGURE) })).toBeUndefined();
	});
});

describe('literals repeated inside serialized functions', () => {
	it('the size gate uses BROWSE_IMAGE_MAX_BYTES', () => {
		expect(sizeGatePlugin.cacheWillUpdate.toString()).toContain(String(BROWSE_IMAGE_MAX_BYTES));
	});

	it('the fallback uses OFFLINE_CACHE_PREFIX', () => {
		expect(offlineFallbackPlugin.cachedResponseWillBeUsed.toString()).toContain(OFFLINE_CACHE_PREFIX);
	});

	it('the figure fallback uses OFFLINE_CACHE_PREFIX', () => {
		expect(offlineImageFallbackPlugin.handlerDidError.toString()).toContain(OFFLINE_CACHE_PREFIX);
	});

	it('the size gate deletes from BROWSE_IMAGE_CACHE', () => {
		expect(sizeGatePlugin.cacheWillUpdate.toString()).toContain(BROWSE_IMAGE_CACHE);
	});

	it('offlineCacheName builds the name the fallback reads', () => {
		expect(offlineCacheName('b')).toBe('offline-book:b');
	});
});

describe('routes', () => {
	it.each([
		['/content/b/chapters/01/x.svg', IMAGE_ROUTE],
		['/content/b/chapters/01/1-1-x.html', CONTENT_ROUTE],
		['/content/b/toc.json', CONTENT_ROUTE]
	])('%s matches its route', (path, route) => {
		expect(route.test(`http://localhost${path}`)).toBe(true);
	});

	it.each([
		['/content/b/chapters/01/x.svg', IMAGE_ROUTE],
		['/content/b/chapters/01/1-1-x.html', CONTENT_ROUTE]
	])('%s with the download bypass query matches no route', (path, route) => {
		expect(route.test(`http://localhost${path}?${OFFLINE_BYPASS_QUERY}`)).toBe(false);
	});
});

describe('plugin order (key order is plugin order in workbox-build)', () => {
	it.each(runtimeCaching.map((r) => [r.options.cacheName, r] as const))(
		'%s: expiration comes before the plugins list',
		(_name, route) => {
			const keys = Object.keys(route.options);
			expect(keys.indexOf('expiration')).toBeLessThan(keys.indexOf('plugins'));
		}
	);

	it('pages: the downloaded-book fallback is the last plugin', () => {
		expect(runtimeCaching[0].options.plugins.at(-1)).toBe(offlineFallbackPlugin);
	});

	it('figures: the downloaded copy is used only when the strategy failed', () => {
		expect(runtimeCaching[1].options.plugins).toContain(offlineImageFallbackPlugin);
	});

	// StaleWhileRevalidate treats a cachedResponseWillBeUsed result as a cache hit, so
	// an ONLINE reader would get the downloaded copy instead of a re-rendered figure.
	it('figures: no plugin answers cache misses from the downloaded copy', () => {
		expect(runtimeCaching[1].options.plugins.some((p) => 'cachedResponseWillBeUsed' in p)).toBe(false);
	});
});
