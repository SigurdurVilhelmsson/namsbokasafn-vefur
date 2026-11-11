/**
 * The matchers and plugins in runtimeCaching.ts, called directly: the worker (worker.ts) is
 * bundled from source, so they run there as the same code. Which route uses which plugin, and
 * in what order, is routes.test.ts.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
	appShellNavigation,
	APP_SHELL_FILE,
	sizeGatePlugin,
	offlineFallbackPlugin,
	offlineImageFallbackPlugin,
	BROWSE_IMAGE_CACHE,
	CONTENT_ROUTE,
	IMAGE_ROUTE,
	OFFLINE_BYPASS_QUERY,
	BROWSE_IMAGE_MAX_BYTES,
	offlineCacheName
} from './runtimeCaching';

const sizeGate = sizeGatePlugin.cacheWillUpdate;
const fallback = offlineFallbackPlugin.cachedResponseWillBeUsed;
const imageFallback = offlineImageFallbackPlugin.handlerDidError;
const FIGURE = 'http://localhost/content/b/chapters/01/x.svg';

const response = (body: string, headers: Record<string, string> = {}, status = 200) =>
	new Response(body, { status, headers: { 'content-type': 'image/svg+xml', ...headers } });

describe('size gate', () => {
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

describe('downloaded-book fallback', () => {
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

describe('figure fallback', () => {
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

describe('stalled-network timeout', () => {
	const willFetch = offlineImageFallbackPlugin.requestWillFetch;
	const didSucceed = offlineImageFallbackPlugin.fetchDidSucceed;
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('leaves the request alone when the book is not downloaded', async () => {
		vi.stubGlobal('caches', { match: vi.fn().mockResolvedValue(undefined) });
		const request = new Request(FIGURE);
		expect(await willFetch({ request, state: {} })).toBe(request);
	});

	it('aborts a downloaded figure whose headers do not arrive within 4 s', async () => {
		vi.stubGlobal('caches', { match: vi.fn().mockResolvedValue(response('downloaded')) });
		const sent = await willFetch({ request: new Request(FIGURE), state: {} });
		vi.advanceTimersByTime(4000);
		expect(sent.signal.aborted).toBe(true);
	});

	it('never aborts once the headers have arrived', async () => {
		vi.stubGlobal('caches', { match: vi.fn().mockResolvedValue(response('downloaded')) });
		const state = {};
		const sent = await willFetch({ request: new Request(FIGURE), state });
		await didSucceed({ response: response('fresh'), state });
		vi.advanceTimersByTime(60_000);
		expect(sent.signal.aborted).toBe(false);
	});
});

describe('downloaded-book cache name', () => {
	it('offlineCacheName builds the name the fallbacks read', () => {
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

describe('offline cold start: the page-load route', () => {
	const matches = appShellNavigation;
	const load = (path: string, { mode = 'navigate', sameOrigin = true } = {}) =>
		matches({
			// A Request with mode 'navigate' cannot be constructed outside a worker.
			request: { mode } as Request,
			url: new URL(`http://localhost${path}`),
			sameOrigin
		});

	it.each([
		'/',
		'/efnafraedi-2e/',
		'/efnafraedi-2e',
		'/efnafraedi-2e/kafli/01/1-1-efnafraedi-i-samhengi/',
		'/efnafraedi-2e/ordabok/',
		'/personuvernd/',
		// "print" as a prefix of a segment, not the /print/ routes
		'/printed-book/'
	])('a page load of %s may fall back to the shell', (path) => {
		expect(load(path)).toBe(true);
	});

	it.each([
		['/print/efnafraedi-2e/bok/', 'the PDF routes'],
		['/print', 'the PDF routes'],
		['/content/efnafraedi-2e/chapters/01/1-1-x.html', 'a raw content file'],
		['/content', 'raw content'],
		['/downloads/efnafraedi-2e/bok.pdf', 'a PDF'],
		['/sitemap.xml', 'a file'],
		['/fonts/OFL.txt', 'a file'],
		['/200.html', 'the shell itself']
	])('a page load of %s (%s) is left to the browser', (path) => {
		expect(load(path)).toBe(false);
	});

	it.each(['cors', 'same-origin', 'no-cors'])('a %s request (not a page load) is not matched', (mode) => {
		expect(load('/efnafraedi-2e/', { mode })).toBe(false);
	});

	it('a page load of another origin is not matched', () => {
		expect(load('/efnafraedi-2e/', { sameOrigin: false })).toBe(false);
	});

	it('the shell is the file adapter-static writes (vite.config.ts, the adapter\'s `fallback`)', () => {
		const config = readFileSync(join(process.cwd(), 'vite.config.ts'), 'utf8');
		expect(config).toMatch(new RegExp(`\\bfallback:\\s*'${APP_SHELL_FILE.replace('.', '\\.')}'`));
	});
});
