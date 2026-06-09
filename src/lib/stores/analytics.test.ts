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
