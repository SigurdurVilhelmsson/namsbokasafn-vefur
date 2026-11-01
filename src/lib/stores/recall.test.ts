/**
 * Tests for recall store — free-recall entries (reader plan P0.2)
 *
 * From feature/reader-v1.1 at dde768e, without its test of the dropped get() getters, plus
 * plan step S5.1's: validation on load and across tabs, the cap, trimming, and the rename
 * migration (CODE-02, CODE-20).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

const STORAGE_KEY = 'namsbokasafn:recall';

let recallStore: typeof import('./recall').recallStore;
let MAX_ENTRIES: number;

const validEntry = (overrides: Record<string, unknown> = {}) => ({
	id: 'e1',
	bookSlug: 'book-a',
	chapterSlug: '01',
	sectionSlug: '1-1',
	text: 'Atóm eru gerð úr róteindum og rafeindum.',
	createdAt: '2026-11-01T10:00:00.000Z',
	...overrides
});

/** Fresh store, loading whatever is in localStorage */
async function importStore() {
	vi.resetModules();
	const module = await import('./recall');
	recallStore = module.recallStore;
	MAX_ENTRIES = module.MAX_ENTRIES;
}

describe('recall store', () => {
	beforeEach(async () => {
		localStorage.clear();
		await importStore();
	});

	it('adds an entry with location and timestamp', () => {
		recallStore.addEntry('book-a', '01', '1-1', 'Atóm eru gerð úr róteindum og rafeindum.');

		const entries = get(recallStore).entries;
		expect(entries).toHaveLength(1);
		expect(entries[0].bookSlug).toBe('book-a');
		expect(entries[0].text).toContain('róteindum');
		expect(entries[0].createdAt).toBeTruthy();
	});

	it('ignores empty or whitespace-only text', () => {
		recallStore.addEntry('book-a', '01', '1-1', '   ');
		expect(get(recallStore).entries).toHaveLength(0);
	});

	it('stores the text trimmed', () => {
		recallStore.addEntry('book-a', '01', '1-1', '  texti \n');
		expect(get(recallStore).entries[0].text).toBe('texti');
	});

	it('removes entries by id', () => {
		recallStore.addEntry('book-a', '01', '1-1', 'texti');
		const id = get(recallStore).entries[0].id;
		recallStore.removeEntry(id);
		expect(get(recallStore).entries).toHaveLength(0);
	});

	it('persists entries to localStorage', () => {
		recallStore.addEntry('book-a', '01', '1-1', 'texti');
		const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
		expect(persisted.entries).toHaveLength(1);
	});

	it('keeps the newest MAX_ENTRIES entries when one more is added', () => {
		for (let i = 0; i <= MAX_ENTRIES; i++) recallStore.addEntry('book-a', '01', '1-1', `færsla ${i}`);
		const texts = get(recallStore).entries.map((e) => e.text);
		expect([texts.length, texts[0], texts.at(-1)]).toEqual([MAX_ENTRIES, 'færsla 1', `færsla ${MAX_ENTRIES}`]);
	});
});

describe('recall store: what it loads', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('loads [null, 5, valid] as the one valid entry', async () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries: [null, 5, validEntry()] }));
		await importStore();
		expect(get(recallStore).entries).toEqual([validEntry()]);
	});

	it.each([
		['a missing id', { id: undefined }],
		['a number for a slug', { sectionSlug: 11 }],
		['no text', { text: undefined }],
		['only whitespace as text', { text: '   ' }],
		['no date', { createdAt: undefined }]
	])('drops an entry with %s', async (_name, overrides) => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries: [validEntry(overrides)] }));
		await importStore();
		expect(get(recallStore).entries).toEqual([]);
	});

	it('loads at most MAX_ENTRIES, the newest', async () => {
		const { MAX_ENTRIES: max } = await import('./recall');
		const stored = Array.from({ length: max + 3 }, (_, i) => validEntry({ id: `e${i}` }));
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries: stored }));
		await importStore();
		const ids = get(recallStore).entries.map((e) => e.id);
		expect([ids.length, ids[0]]).toEqual([max, 'e3']);
	});

	it('loads the defaults from a stored value that is not an object', async () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify([validEntry()]));
		await importStore();
		expect(get(recallStore).entries).toEqual([]);
	});
});

describe('recall store: another tab', () => {
	beforeEach(async () => {
		localStorage.clear();
		await importStore();
	});

	const fromOtherTab = (newValue: string) =>
		window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue }));

	it("takes another tab's entries, validated", () => {
		fromOtherTab(JSON.stringify({ entries: [null, validEntry()] }));
		expect(get(recallStore).entries).toEqual([validEntry()]);
	});

	it('empties when another tab removes the key (an erase)', () => {
		recallStore.addEntry('book-a', '01', '1-1', 'texti');
		fromOtherTab('null');
		expect(get(recallStore).entries).toEqual([]);
	});
});

describe('recall store: renamed sections (#258)', () => {
	const RENAME = { bookSlug: 'book-a', fromChapter: '01', fromSlug: '1-1', toChapter: '01', toSlug: '1-1-nytt' };

	beforeEach(async () => {
		localStorage.clear();
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries: [validEntry(), validEntry({ id: 'e2', sectionSlug: '1-2' })] }));
		await importStore();
	});

	it('moves an entry seeded under the old slug, and only that one', () => {
		recallStore.renameSections([RENAME]);
		expect(get(recallStore).entries.map((e) => e.sectionSlug)).toEqual(['1-1-nytt', '1-2']);
	});

	it('writes nothing on a second call', () => {
		recallStore.renameSections([RENAME]);
		const writes = vi.mocked(localStorage.setItem).mock.calls.length;
		recallStore.renameSections([RENAME]);
		expect(vi.mocked(localStorage.setItem).mock.calls.length).toBe(writes);
	});
});

// Plan step S5.2: one prompt per section (call 2), even for a section marked read by hand (D10)
describe('recall store: prompted sections', () => {
	beforeEach(async () => {
		localStorage.clear();
		await importStore();
	});

	it('remembers a prompted section once', () => {
		recallStore.markPrompted('book-a', '01', '1-1');
		recallStore.markPrompted('book-a', '01', '1-1');
		expect(get(recallStore).prompted).toEqual([{ bookSlug: 'book-a', chapterSlug: '01', sectionSlug: '1-1' }]);
	});

	it('moves a prompted section with a rename', () => {
		recallStore.markPrompted('book-a', '01', '1-1');
		recallStore.renameSections([{ bookSlug: 'book-a', fromChapter: '01', fromSlug: '1-1', toChapter: '01', toSlug: '1-1-nytt' }]);
		expect(get(recallStore).prompted.map((p) => p.sectionSlug)).toEqual(['1-1-nytt']);
	});

	it('loads only valid prompted sections', async () => {
		const good = { bookSlug: 'book-a', chapterSlug: '01', sectionSlug: '1-1' };
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries: [], prompted: [null, { bookSlug: 'book-a' }, good] }));
		await importStore();
		expect(get(recallStore).prompted).toEqual([good]);
	});

	it('loads S5.1 data, which has no prompted list, as none prompted', async () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries: [validEntry()] }));
		await importStore();
		expect([get(recallStore).entries.length, get(recallStore).prompted]).toEqual([1, []]);
	});
});
