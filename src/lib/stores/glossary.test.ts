/**
 * Tests for glossary store — load caching, book switching, and load races
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import type { GlossaryTerm } from '$lib/types/content';

let glossaryStore: typeof import('./glossary').glossaryStore;

function makeTerms(prefix: string): GlossaryTerm[] {
	return [
		{ term: `${prefix}-efni`, definition: `Skilgreining á ${prefix}-efni` },
		{ term: `${prefix}-orka`, definition: `Skilgreining á ${prefix}-orku` }
	] as GlossaryTerm[];
}

function okResponse(terms: GlossaryTerm[]) {
	return { ok: true, json: async () => ({ terms }) };
}

describe('glossary store', () => {
	beforeEach(async () => {
		vi.resetModules();
		const module = await import('./glossary');
		glossaryStore = module.glossaryStore;
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('loads terms for a book', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => okResponse(makeTerms('a')))
		);

		await glossaryStore.load('book-a');

		const state = get(glossaryStore);
		expect(state.bookSlug).toBe('book-a');
		expect(state.terms).toHaveLength(2);
		expect(state.error).toBeNull();
	});

	it('loads a second book after the first has loaded', async () => {
		const fetchMock = vi.fn(async (url: string) =>
			okResponse(makeTerms(url.includes('book-a') ? 'a' : 'b'))
		);
		vi.stubGlobal('fetch', fetchMock);

		await glossaryStore.load('book-a');
		await glossaryStore.load('book-b');

		const state = get(glossaryStore);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(state.bookSlug).toBe('book-b');
		expect(state.terms[0].term).toBe('b-efni');
	});

	it('shares an in-flight load for the same book', async () => {
		let resolveFetch!: (v: unknown) => void;
		const fetchMock = vi.fn(
			() => new Promise((resolve) => (resolveFetch = resolve))
		);
		vi.stubGlobal('fetch', fetchMock);

		const p1 = glossaryStore.load('book-a');
		const p2 = glossaryStore.load('book-a');
		expect(fetchMock).toHaveBeenCalledTimes(1);

		resolveFetch(okResponse(makeTerms('a')));
		await Promise.all([p1, p2]);
		expect(get(glossaryStore).bookSlug).toBe('book-a');
	});

	it('keeps the most recently requested book when loads race', async () => {
		const resolvers = new Map<string, (v: unknown) => void>();
		const fetchMock = vi.fn(
			(url: string) =>
				new Promise((resolve) => {
					resolvers.set(url.includes('book-a') ? 'a' : 'b', resolve);
				})
		);
		vi.stubGlobal('fetch', fetchMock);

		const pA = glossaryStore.load('book-a');
		const pB = glossaryStore.load('book-b');

		// Book B (newest request) resolves first; A's stale result arrives late
		resolvers.get('b')!(okResponse(makeTerms('b')));
		await pB;
		resolvers.get('a')!(okResponse(makeTerms('a')));
		await pA;

		const state = get(glossaryStore);
		expect(state.bookSlug).toBe('book-b');
		expect(state.terms[0].term).toBe('b-efni');
	});

	it('can retry after a failed load', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({ ok: false })
			.mockResolvedValueOnce(okResponse(makeTerms('a')));
		vi.stubGlobal('fetch', fetchMock);

		await glossaryStore.load('book-a');
		expect(get(glossaryStore).error).not.toBeNull();

		await glossaryStore.load('book-a');
		const state = get(glossaryStore);
		expect(state.error).toBeNull();
		expect(state.bookSlug).toBe('book-a');
	});

	it('clear() drops the result of an in-flight load', async () => {
		let resolveFetch!: (v: unknown) => void;
		vi.stubGlobal(
			'fetch',
			vi.fn(() => new Promise((resolve) => (resolveFetch = resolve)))
		);

		const p = glossaryStore.load('book-a');
		glossaryStore.clear();
		resolveFetch(okResponse(makeTerms('a')));
		await p;

		const state = get(glossaryStore);
		expect(state.bookSlug).toBeNull();
		expect(state.terms).toHaveLength(0);
	});
});
