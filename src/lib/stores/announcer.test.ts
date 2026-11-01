/**
 * The app's one polite status region (plan step S4.2, UI-01): announce() and LiveAnnouncer.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { get } from 'svelte/store';
import { ANNOUNCE_DELAY_MS, announce, announcement } from './announcer';
import LiveAnnouncer from '$lib/components/LiveAnnouncer.svelte';

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.runOnlyPendingTimers();
	vi.useRealTimers();
});

describe('announce', () => {
	it('sets the text after a short empty moment', () => {
		announce('Kort 2 af 5');
		expect(get(announcement)).toBe('');
		vi.advanceTimersByTime(ANNOUNCE_DELAY_MS);
		expect(get(announcement)).toBe('Kort 2 af 5');
	});

	it('clears the region before repeating the same text, so it is spoken again', () => {
		announce('Kort 2 af 5');
		vi.advanceTimersByTime(ANNOUNCE_DELAY_MS);
		announce('Kort 2 af 5');
		expect(get(announcement)).toBe('');
		vi.advanceTimersByTime(ANNOUNCE_DELAY_MS);
		expect(get(announcement)).toBe('Kort 2 af 5');
	});

	it('keeps only the last of two quick announcements', () => {
		announce('fyrsta');
		announce('annað');
		vi.advanceTimersByTime(ANNOUNCE_DELAY_MS);
		expect(get(announcement)).toBe('annað');
	});
});

describe('LiveAnnouncer', () => {
	it('is a polite status region that holds the announcement', () => {
		const target = document.body.appendChild(document.createElement('div'));
		const component = mount(LiveAnnouncer, { target });
		const region = target.querySelector('[role="status"]');
		expect(region?.getAttribute('aria-live')).toBe('polite');
		announce('Kort 3 af 5');
		vi.advanceTimersByTime(ANNOUNCE_DELAY_MS);
		flushSync();
		expect(region?.textContent).toBe('Kort 3 af 5');
		unmount(component);
		target.remove();
	});
});
