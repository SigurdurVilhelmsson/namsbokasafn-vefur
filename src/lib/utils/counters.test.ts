/**
 * Local counters (plan step S5.4, register PED-17): how often a prompt was shown, saved,
 * skipped or abandoned, kept on the device as small aggregate counts, never free text.
 * Keyed by book and event, both from closed lists, so the stored object stays bounded.
 */
import { describe, expect, it } from 'vitest';
import { books, retiredBooks } from '$lib/types/book';
import {
	COUNTER_EVENTS,
	countsExport,
	incrementCounter,
	recallSummaryLine,
	recallTotals,
	sanitizeCounters,
	type Counters
} from './counters';

const BOOK = 'efnafraedi-2e';

describe('incrementCounter', () => {
	it('counts an event for a registered book', () => {
		expect(incrementCounter({}, BOOK, 'recallShown')).toEqual({ [BOOK]: { recallShown: 1 } });
	});

	it('adds to an existing count without changing the object it was given', () => {
		const before: Counters = { [BOOK]: { recallShown: 2 } };
		const after = incrementCounter(before, BOOK, 'recallShown');
		expect([after[BOOK].recallShown, before[BOOK].recallShown]).toEqual([3, 2]);
	});

	it('ignores a book that is not registered', () => {
		expect(incrementCounter({}, 'not-a-book', 'recallShown')).toEqual({});
	});

	it('ignores a retired book', () => {
		expect(incrementCounter({}, retiredBooks[0].slug, 'recallShown')).toEqual({});
	});

	it('stops at the largest safe integer', () => {
		const full: Counters = { [BOOK]: { recallSaved: Number.MAX_SAFE_INTEGER } };
		expect(incrementCounter(full, BOOK, 'recallSaved')[BOOK].recallSaved).toBe(Number.MAX_SAFE_INTEGER);
	});
});

describe('sanitizeCounters', () => {
	it('keeps valid counts as they are', () => {
		const valid = { [BOOK]: { recallShown: 4, recallSaved: 2, recallSkipped: 1, recallAbandoned: 1 } };
		expect(sanitizeCounters(valid)).toEqual(valid);
	});

	it('drops an unknown event', () => {
		expect(sanitizeCounters({ [BOOK]: { recallShown: 1, pageTurn: 9 } })).toEqual({ [BOOK]: { recallShown: 1 } });
	});

	it('drops an unknown book', () => {
		expect(sanitizeCounters({ 'not-a-book': { recallShown: 1 } })).toEqual({});
	});

	it('drops a count that is not a whole, non-negative, safe number', () => {
		const bad = { recallShown: -1, recallSaved: 1.5, recallSkipped: '3', recallAbandoned: 2 ** 60 };
		expect(sanitizeCounters({ [BOOK]: bad })).toEqual({});
	});

	it('returns an empty object for anything that is not an object of objects', () => {
		expect([sanitizeCounters(null), sanitizeCounters([1]), sanitizeCounters({ [BOOK]: 5 })]).toEqual([{}, {}, {}]);
	});
});

describe('the bound (M5 exit criterion)', () => {
	it('keeps 10,000 events over every book and event under 2 KB', () => {
		let counters: Counters = {};
		for (let i = 0; i < 10_000; i++) {
			counters = incrementCounter(counters, books[i % books.length].slug, COUNTER_EVENTS[i % COUNTER_EVENTS.length]);
		}
		expect(JSON.stringify(counters).length).toBeLessThan(2048);
	});

	it('stores nothing for 10,000 different unknown books', () => {
		let counters: Counters = {};
		for (let i = 0; i < 10_000; i++) counters = incrementCounter(counters, `book-${i}`, 'recallShown');
		expect(counters).toEqual({});
	});
});

describe('recallTotals', () => {
	it('adds each event up across books', () => {
		const counters: Counters = {
			[BOOK]: { recallShown: 3, recallSaved: 1, recallSkipped: 1 },
			[books[1].slug]: { recallShown: 2, recallSaved: 1, recallAbandoned: 1 }
		};
		expect(recallTotals(counters)).toEqual({ shown: 5, saved: 2, skipped: 1, abandoned: 1 });
	});
});

describe('recallSummaryLine', () => {
	const line = (saved: number, skipped: number) => recallSummaryLine({ shown: saved + skipped, saved, skipped, abandoned: 0 });

	it('says nothing before any prompt was shown', () => {
		expect(recallSummaryLine({ shown: 0, saved: 0, skipped: 0, abandoned: 0 })).toBeNull();
	});

	it('uses the singular for 1 and 21', () => {
		expect([line(1, 0), line(21, 0)]).toEqual([
			'Þú hefur vistað 1 upprifjun og sleppt 0.',
			'Þú hefur vistað 21 upprifjun og sleppt 0.'
		]);
	});

	it('uses the plural for 0, 11 and 12', () => {
		expect([line(0, 2), line(11, 0), line(12, 5)]).toEqual([
			'Þú hefur vistað 0 upprifjanir og sleppt 2.',
			'Þú hefur vistað 11 upprifjanir og sleppt 0.',
			'Þú hefur vistað 12 upprifjanir og sleppt 5.'
		]);
	});
});

describe('countsExport (S5.5, D09)', () => {
	const counters: Counters = { [BOOK]: { recallShown: 3, recallSaved: 2, recallSkipped: 1 } };

	it('holds the format, the version, the date and the counts, and nothing else', () => {
		expect(JSON.parse(countsExport(counters, '2026-11-01'))).toEqual({
			format: 'namsbokasafn-counts',
			version: 1,
			date: '2026-11-01',
			counts: counters
		});
	});

	it('leaves out anything the counters may not hold', () => {
		const dirty = { [BOOK]: { recallShown: 1, note: 'texti' }, 'not-a-book': { recallShown: 1 } } as unknown as Counters;
		expect(JSON.parse(countsExport(dirty, '2026-11-01')).counts).toEqual({ [BOOK]: { recallShown: 1 } });
	});

	it('is indented, so the preview reads line by line', () => {
		expect(countsExport({}, '2026-11-01').split('\n').length).toBeGreaterThan(1);
	});
});
