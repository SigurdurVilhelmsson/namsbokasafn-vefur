/**
 * The plugins in runtimeCaching.ts run inside the service worker as their SOURCE
 * TEXT (workbox-build serializes them with fn.toString()). So every behavioural test
 * here calls a copy rebuilt from that text in a scope with none of this module's
 * bindings: a closure over a module constant throws a ReferenceError here, exactly
 * as it would in build/sw.js. e2e/offline.spec.ts checks the real emitted sw.js.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
	runtimeCaching,
	sizeGatePlugin,
	offlineFallbackPlugin,
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

const response = (body: string, headers: Record<string, string> = {}, status = 200) =>
	new Response(body, { status, headers: { 'content-type': 'image/svg+xml', ...headers } });

describe('size gate (serialized)', () => {
	it('keeps a figure of exactly the limit', async () => {
		const r = response('x'.repeat(BROWSE_IMAGE_MAX_BYTES));
		expect(await sizeGate({ response: r })).toBe(r);
	});

	it('drops a figure one byte over the limit when no Content-Length is sent', async () => {
		expect(await sizeGate({ response: response('x'.repeat(BROWSE_IMAGE_MAX_BYTES + 1)) })).toBeNull();
	});

	it('drops a figure whose Content-Length is over the limit without reading it', async () => {
		const r = response('small', { 'content-length': String(5_000_000) });
		expect(await sizeGate({ response: r })).toBeNull();
	});

	it('measures the body when the response is content-encoded', async () => {
		const r = response('small', { 'content-length': String(5_000_000), 'content-encoding': 'gzip' });
		expect(await sizeGate({ response: r })).toBe(r);
	});

	it('drops a non-200 response', async () => {
		expect(await sizeGate({ response: response('gone', {}, 404) })).toBeNull();
	});

	it("drops nginx's SPA shell, which answers a missing figure with 200 text/html", async () => {
		const r = response('<!doctype html>', { 'content-type': 'text/html; charset=utf-8' });
		expect(await sizeGate({ response: r })).toBeNull();
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

describe('literals repeated inside serialized functions', () => {
	it('the size gate uses BROWSE_IMAGE_MAX_BYTES', () => {
		expect(sizeGatePlugin.cacheWillUpdate.toString()).toContain(String(BROWSE_IMAGE_MAX_BYTES));
	});

	it('the fallback uses OFFLINE_CACHE_PREFIX', () => {
		expect(offlineFallbackPlugin.cachedResponseWillBeUsed.toString()).toContain(OFFLINE_CACHE_PREFIX);
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

	it.each(runtimeCaching.map((r) => [r.options.cacheName, r] as const))(
		'%s: the downloaded-book fallback is the last plugin',
		(_name, route) => {
			expect(route.options.plugins.at(-1)).toBe(offlineFallbackPlugin);
		}
	);
});
