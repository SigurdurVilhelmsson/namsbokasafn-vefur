/**
 * Tests for search index utilities: XSS prevention, and a build that fails and is retried.
 */
import { afterEach, describe, it, expect, vi } from 'vitest';
import type { TableOfContents } from '$lib/types/content';
import type { WorkerMessage, WorkerResponse } from '$lib/workers/search.types';
import { escapeHtml, highlightQuery } from './searchIndex';

describe('escapeHtml', () => {
	it('should escape HTML entities', () => {
		expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
		expect(escapeHtml('&')).toBe('&amp;');
		expect(escapeHtml('"')).toBe('&quot;');
		expect(escapeHtml("'")).toBe('&#39;');
	});

	it('should escape all dangerous characters in a string', () => {
		const input = '<script>alert("XSS")</script>';
		const expected = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;';
		expect(escapeHtml(input)).toBe(expected);
	});

	it('should handle normal text without escaping', () => {
		expect(escapeHtml('Hello World')).toBe('Hello World');
		expect(escapeHtml('Icelandic: Þórður Ásta')).toBe('Icelandic: Þórður Ásta');
	});

	it('should handle empty string', () => {
		expect(escapeHtml('')).toBe('');
	});

	it('should escape event handler injection attempts', () => {
		const input = '<img src=x onerror=alert(1)>';
		expect(escapeHtml(input)).not.toContain('<img');
		expect(escapeHtml(input)).toBe('&lt;img src=x onerror=alert(1)&gt;');
	});
});

describe('highlightQuery', () => {
	it('should highlight matching text', () => {
		const result = highlightQuery('Hello World', 'World');
		expect(result).toContain('<mark');
		expect(result).toContain('World');
		expect(result).toContain('</mark>');
	});

	it('should be case-insensitive', () => {
		const result = highlightQuery('Hello WORLD', 'world');
		expect(result).toContain('<mark');
		expect(result).toContain('WORLD');
	});

	it('should escape HTML in the text', () => {
		const result = highlightQuery('<script>alert("test")</script>', 'test');
		expect(result).not.toContain('<script>');
		expect(result).toContain('&lt;script&gt;');
		expect(result).toContain('<mark');
	});

	it('should escape HTML in the query', () => {
		const result = highlightQuery('Some text', '<script>');
		// The query should be escaped, so it won't match anything dangerous
		expect(result).not.toContain('<script>');
		expect(result).toBe('Some text');
	});

	it('should handle XSS attempts in query', () => {
		const text = 'This is a test of XSS prevention';
		const maliciousQuery = '<img src=x onerror=alert(1)>';

		const result = highlightQuery(text, maliciousQuery);

		// Should not contain unescaped HTML
		expect(result).not.toContain('<img');
		// Should return escaped text without highlights (no match)
		expect(result).toBe('This is a test of XSS prevention');
	});

	it('should handle XSS attempts in text', () => {
		const maliciousText = 'Click <a href="javascript:alert(1)">here</a>';
		const query = 'Click';

		const result = highlightQuery(maliciousText, query);

		// The anchor tag should be escaped
		expect(result).not.toContain('<a href=');
		expect(result).toContain('&lt;a href=');
		// But Click should still be highlighted
		expect(result).toContain('<mark');
		expect(result).toContain('Click');
	});

	it('should return escaped text when query is empty', () => {
		const result = highlightQuery('<script>', '');
		expect(result).toBe('&lt;script&gt;');
	});

	it('should return escaped text when query is whitespace only', () => {
		const result = highlightQuery('<script>', '   ');
		expect(result).toBe('&lt;script&gt;');
	});

	it('should handle special regex characters in query', () => {
		const text = 'Price is $100.00 (discounted)';
		const query = '$100.00';

		const result = highlightQuery(text, query);
		expect(result).toContain('<mark');
	});

	it('should highlight multiple occurrences', () => {
		const result = highlightQuery('test test test', 'test');
		const markCount = (result.match(/<mark/g) || []).length;
		expect(markCount).toBe(3);
	});

	it('should preserve ampersands correctly', () => {
		const result = highlightQuery('Tom & Jerry', 'Tom');
		expect(result).toContain('&amp;');
		expect(result).toContain('<mark');
	});
});

describe('buildSearchIndex after a failed build', () => {
	const toc = {
		title: 'bok',
		chapters: [{ number: 1, title: 'Kafli', sections: [{ number: '1.1', title: 'Hluti', file: '1-1-hluti.html' }] }]
	} as TableOfContents;

	/**
	 * A stand-in for the search worker: it answers each 'build' with the next reply in
	 * `replies` (on a microtask, as a real worker answers later) and records every build.
	 */
	function fakeWorker(replies: WorkerResponse[]) {
		const builds: string[] = [];
		class FakeWorker {
			onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
			onerror: ((event: unknown) => void) | null = null;
			postMessage(message: WorkerMessage) {
				if (message.type !== 'build') return;
				builds.push(message.bookSlug);
				const reply = replies.shift() ?? { type: 'build-complete', documentCount: 1 };
				queueMicrotask(() => this.onmessage?.({ data: reply } as MessageEvent<WorkerResponse>));
			}
		}
		return { FakeWorker, builds };
	}

	/** A fresh copy of the module, so each test has its own singleton index. */
	async function loadSearchIndex() {
		vi.resetModules();
		return import('./searchIndex');
	}

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("rejects with the worker's build-error, and the next call for the same book builds again", async () => {
		vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '<p>efni</p>' })));
		const { FakeWorker, builds } = fakeWorker([{ type: 'build-error', error: 'Fuse failed' }]);
		vi.stubGlobal('Worker', FakeWorker);
		const { buildSearchIndex, isSearchIndexReady } = await loadSearchIndex();
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(buildSearchIndex(toc, 'bok')).rejects.toThrow('Fuse failed');
		expect(isSearchIndexReady()).toBe(false);

		await expect(buildSearchIndex(toc, 'bok')).resolves.toBeUndefined();
		expect(isSearchIndexReady()).toBe(true);
		expect(builds).toEqual(['bok', 'bok']);
		error.mockRestore();
	});

	it("a failed build for another book leaves no index ready, so a retry for that book builds instead of reading the old one's", async () => {
		vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '<p>efni</p>' })));
		const { FakeWorker, builds } = fakeWorker([
			{ type: 'build-complete', documentCount: 1 },
			{ type: 'build-error', error: 'Fuse failed' }
		]);
		vi.stubGlobal('Worker', FakeWorker);
		const { buildSearchIndex, isSearchIndexReady } = await loadSearchIndex();
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});

		await buildSearchIndex(toc, 'bok-a');
		expect(isSearchIndexReady()).toBe(true);
		await expect(buildSearchIndex(toc, 'bok-b')).rejects.toThrow('Fuse failed');
		expect(isSearchIndexReady()).toBe(false);

		await buildSearchIndex(toc, 'bok-b');
		expect(isSearchIndexReady()).toBe(true);
		expect(builds).toEqual(['bok-a', 'bok-b', 'bok-b']);
		error.mockRestore();
	});

	it('recovers on the main-thread path too (no Worker): a build that throws, then a good one', async () => {
		vi.stubGlobal('Worker', undefined);
		vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '<p>efni</p>' })));
		const { buildSearchIndex, isSearchIndexReady } = await loadSearchIndex();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		// A table of contents with no chapters makes the build throw before any fetch.
		await expect(buildSearchIndex({ title: 'bok' } as TableOfContents, 'bok')).rejects.toThrow(TypeError);
		expect(isSearchIndexReady()).toBe(false);

		await expect(buildSearchIndex(toc, 'bok')).resolves.toBeUndefined();
		expect(isSearchIndexReady()).toBe(true);
		warn.mockRestore();
	});
});
