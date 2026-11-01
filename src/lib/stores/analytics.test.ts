/**
 * Tests for analytics store — session lifecycle, persistence, and the
 * stale-session protections added after the June 2026 audit (finding 1.6)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';

const STORAGE_KEY = 'namsbokasafn:analytics';

let analyticsStore: typeof import('./analytics').analyticsStore;

function persistedState(overrides: Record<string, unknown> = {}) {
	return {
		sessions: [],
		currentSession: null,
		sectionReadingTimes: {},
		dailyStats: {},
		activityLog: [],
		currentStreak: 0,
		longestStreak: 0,
		lastActiveDate: null,
		goals: [],
		hourlyReadingData: {},
		...overrides
	};
}

async function importStore() {
	vi.resetModules();
	const module = await import('./analytics');
	analyticsStore = module.analyticsStore;
}

describe('analytics store sessions', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('does not restore a dangling currentSession from localStorage', async () => {
		const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify(
				persistedState({
					currentSession: {
						sectionKey: 'book/ch/sec',
						startTime: threeDaysAgo,
						endTime: null,
						durationSeconds: 0,
						bookSlug: 'book',
						chapterSlug: 'ch',
						sectionSlug: 'sec',
						hourOfDay: 10
					}
				})
			)
		);

		await importStore();

		expect(get(analyticsStore).currentSession).toBeNull();

		// Starting a new session must not credit the dangling one
		analyticsStore.startReadingSession('book', 'ch', 'sec2');
		const state = get(analyticsStore);
		expect(state.sessions).toHaveLength(0);
		expect(state.sectionReadingTimes['book/ch/sec']).toBeUndefined();
	});

	it('excludes currentSession from what is persisted', async () => {
		await importStore();

		analyticsStore.startReadingSession('book', 'ch', 'sec');
		expect(get(analyticsStore).currentSession).not.toBeNull();

		const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
		expect(persisted.currentSession).toBeNull();
	});

	it('caps recorded session duration at 30 minutes', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-06-09T10:00:00Z'));
		await importStore();

		analyticsStore.startReadingSession('book', 'ch', 'sec');
		// Laptop lid closed for two hours…
		vi.setSystemTime(new Date('2026-06-09T12:00:00Z'));
		analyticsStore.endReadingSession();

		const state = get(analyticsStore);
		expect(state.sectionReadingTimes['book/ch/sec'].totalSeconds).toBe(30 * 60);
		expect(state.sessions[0].durationSeconds).toBe(30 * 60);
	});

	it('records normal session durations unchanged', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-06-09T10:00:00Z'));
		await importStore();

		analyticsStore.startReadingSession('book', 'ch', 'sec');
		vi.setSystemTime(new Date('2026-06-09T10:05:00Z'));
		analyticsStore.endReadingSession();

		expect(get(analyticsStore).sectionReadingTimes['book/ch/sec'].totalSeconds).toBe(300);
	});

	it('keeps this tab’s in-flight session when another tab syncs state', async () => {
		await importStore();

		analyticsStore.startReadingSession('book', 'ch', 'sec');
		const localSession = get(analyticsStore).currentSession;
		expect(localSession).not.toBeNull();

		// Another tab persists a state update (its persisted currentSession
		// is always null); the storage event must not clobber ours
		window.dispatchEvent(
			new StorageEvent('storage', {
				key: STORAGE_KEY,
				newValue: JSON.stringify(persistedState({ currentStreak: 42 }))
			})
		);

		const state = get(analyticsStore);
		expect(state.currentStreak).toBe(42);
		expect(state.currentSession).toEqual(localSession);
	});
});

describe('analytics store counters (plan step S5.4, PED-17)', () => {
	const BOOK = 'efnafraedi-2e';
	const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').counters;

	beforeEach(() => {
		localStorage.clear();
	});

	it('saves a counted event', async () => {
		await importStore();
		analyticsStore.countEvent(BOOK, 'recallShown');
		expect(stored()).toEqual({ [BOOK]: { recallShown: 1 } });
	});

	it('loads state saved before counters existed with no counts', async () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState()));
		await importStore();
		expect(get(analyticsStore).counters).toEqual({});
	});

	it('drops an unknown counter key on load', async () => {
		const counters = { [BOOK]: { recallShown: 2, pageTurn: 7 }, 'not-a-book': { recallShown: 1 } };
		localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState({ counters })));
		await importStore();
		expect(get(analyticsStore).counters).toEqual({ [BOOK]: { recallShown: 2 } });
	});

	it("drops an unknown counter key in another tab's write", async () => {
		await importStore();
		const counters = { [BOOK]: { recallSaved: 3, pageTurn: 7 } };
		window.dispatchEvent(
			new StorageEvent('storage', { key: STORAGE_KEY, newValue: JSON.stringify(persistedState({ counters })) })
		);
		expect(get(analyticsStore).counters).toEqual({ [BOOK]: { recallSaved: 3 } });
	});

	it("'Hreinsa tölfræði' (clearAllData) empties them", async () => {
		await importStore();
		analyticsStore.countEvent(BOOK, 'recallSkipped');
		analyticsStore.clearAllData();
		expect(stored()).toEqual({});
	});
});

describe('analytics store counters: an uncounted book', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('writes nothing for a book that is not counted', async () => {
		await importStore();
		// The test setup's localStorage is a mock whose setItem is already a spy.
		const setItem = vi.mocked(localStorage.setItem);
		setItem.mockClear();
		analyticsStore.countEvent('not-a-book', 'recallShown');
		expect(setItem).not.toHaveBeenCalled();
	});
});
