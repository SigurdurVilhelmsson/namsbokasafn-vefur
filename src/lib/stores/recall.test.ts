/**
 * Tests for recall store — free-recall entries (reader plan P0.2)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

let recallStore: typeof import('./recall').recallStore;

describe('recall store', () => {
	beforeEach(async () => {
		localStorage.clear();
		vi.resetModules();
		const module = await import('./recall');
		recallStore = module.recallStore;
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

	it('filters entries by section and by book', () => {
		recallStore.addEntry('book-a', '01', '1-1', 'fyrsta');
		recallStore.addEntry('book-a', '01', '1-2', 'önnur');
		recallStore.addEntry('book-b', '01', '1-1', 'þriðja');

		expect(recallStore.getForSection('book-a', '01', '1-1')).toHaveLength(1);
		expect(recallStore.getForBook('book-a')).toHaveLength(2);
		expect(recallStore.getForBook('book-b')).toHaveLength(1);
	});

	it('removes entries by id', () => {
		recallStore.addEntry('book-a', '01', '1-1', 'texti');
		const id = get(recallStore).entries[0].id;
		recallStore.removeEntry(id);
		expect(get(recallStore).entries).toHaveLength(0);
	});

	it('persists entries to localStorage', () => {
		recallStore.addEntry('book-a', '01', '1-1', 'texti');
		const persisted = JSON.parse(localStorage.getItem('namsbokasafn:recall')!);
		expect(persisted.entries).toHaveLength(1);
	});
});
