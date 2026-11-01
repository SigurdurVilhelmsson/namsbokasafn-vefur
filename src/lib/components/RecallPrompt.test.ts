/**
 * RecallPrompt (plan step S5.3: UI-01, CODE-21, PED-18, PED-25). The section-end recall
 * prompt: named by its heading, bounded copy that names the section, the save announced and
 * kept on screen until dismissed, Escape only while the box is empty, and no autofocus or
 * keyboard hint on touch screens.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { get } from 'svelte/store';
import RecallPrompt from './RecallPrompt.svelte';
import { recallStore } from '$lib/stores/recall';
import { announcement, ANNOUNCE_DELAY_MS } from '$lib/stores/announcer';

const WHY_SEEN_KEY = 'namsbokasafn:seen-why-recall';

let component: ReturnType<typeof mount> | null = null;

/** jsdom has no matchMedia: answer as a desktop (fine pointer, hover) or a touch screen */
function pointer(kind: 'fine' | 'coarse') {
	window.matchMedia = ((query: string) => ({
		matches: kind === 'coarse' ? query.includes('coarse') : !query.includes('coarse') && !query.includes('none'),
		media: query,
		onchange: null,
		addEventListener() {},
		removeEventListener() {},
		addListener() {},
		removeListener() {},
		dispatchEvent: () => false
	})) as typeof window.matchMedia;
}

function render(props: Record<string, unknown> = {}) {
	const target = document.body.appendChild(document.createElement('div'));
	component = mount(RecallPrompt, {
		target,
		props: {
			bookSlug: 'efnafraedi-2e',
			chapterSlug: '01',
			sectionSlug: '1-3-efnislegir-og-efnafraedilegir-eiginleikar',
			sectionNumber: '1.3',
			onclose: () => {},
			onsaved: () => {},
			...props
		} as never
	});
	flushSync();
	return target;
}

const textarea = (t: HTMLElement) => t.querySelector('textarea') as HTMLTextAreaElement;
const button = (t: HTMLElement, name: string) =>
	[...t.querySelectorAll('button')].find((b) => b.textContent?.trim() === name) as HTMLButtonElement | undefined;

function type(t: HTMLElement, value: string) {
	const box = textarea(t);
	box.value = value;
	box.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

function key(t: HTMLElement, init: KeyboardEventInit) {
	textarea(t).dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
	flushSync();
}

/** Type a recall and save it with Ctrl+Enter (independent of the save button's label) */
function save(t: HTMLElement) {
	type(t, 'Eðliseiginleikar breyta ekki efninu.');
	key(t, { key: 'Enter', ctrlKey: true });
}

/** The save button, whatever its exact label */
const saveButton = (t: HTMLElement) =>
	[...t.querySelectorAll('button')].find((b) => /^Vista/.test(b.textContent?.trim() ?? '')) as HTMLButtonElement;

beforeEach(() => {
	vi.useFakeTimers();
	pointer('fine');
	localStorage.clear();
});

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = '';
	vi.useRealTimers();
	vi.restoreAllMocks();
	// @ts-expect-error jsdom has no matchMedia of its own; remove the stub
	delete window.matchMedia;
});

describe('RecallPrompt: names and copy', () => {
	it('names the section in its heading', () => {
		const t = render();
		expect(t.querySelector('h3')?.textContent).toContain('1.3');
	});

	it('names the textarea by the heading, not by its placeholder', () => {
		const t = render();
		const id = textarea(t).getAttribute('aria-labelledby');
		expect(id && document.getElementById(id)).toBe(t.querySelector('h3'));
	});

	it('describes the textarea with the instruction', () => {
		const t = render();
		const id = textarea(t).getAttribute('aria-describedby');
		expect(id && document.getElementById(id)?.textContent).toMatch(/2–3/);
	});

	it('ends the placeholder with a real ellipsis', () => {
		const t = render();
		expect(textarea(t).placeholder.endsWith('…')).toBe(true);
	});

	it("labels the save button 'Vista', so it fits on one line on a phone", () => {
		const t = render();
		expect(button(t, 'Vista')).toBeDefined();
	});
});

describe('RecallPrompt: saving', () => {
	it('writes nothing on Ctrl+Enter with a blank box', () => {
		const addEntry = vi.spyOn(recallStore, 'addEntry');
		const t = render();
		type(t, '   ');
		key(t, { key: 'Enter', ctrlKey: true });
		expect(addEntry).not.toHaveBeenCalled();
	});

	it('keeps the form after a blank Ctrl+Enter', () => {
		const t = render();
		type(t, '   ');
		key(t, { key: 'Enter', ctrlKey: true });
		expect(textarea(t)).not.toBeNull();
	});

	it('disables the save button while the box is blank', () => {
		const t = render();
		type(t, '  ');
		expect(saveButton(t).disabled).toBe(true);
	});

	it('writes the entry once on Ctrl+Enter', () => {
		const addEntry = vi.spyOn(recallStore, 'addEntry');
		const t = render();
		type(t, 'Eðliseiginleikar breyta ekki efninu.');
		key(t, { key: 'Enter', ctrlKey: true });
		expect(addEntry).toHaveBeenCalledTimes(1);
	});

	it('saves from the save button too', () => {
		const addEntry = vi.spyOn(recallStore, 'addEntry');
		const t = render();
		type(t, 'Eðliseiginleikar breyta ekki efninu.');
		saveButton(t).click();
		expect(addEntry).toHaveBeenCalledTimes(1);
	});

	it('announces the saved message through the shared announcer', () => {
		const t = render();
		save(t);
		vi.advanceTimersByTime(ANNOUNCE_DELAY_MS);
		expect(get(announcement)).toMatch(/^Vistað/);
	});

	it('tells the page it saved, so the page can move focus', () => {
		const onsaved = vi.fn();
		const t = render({ onsaved });
		save(t);
		expect(onsaved).toHaveBeenCalledTimes(1);
	});

	it('keeps the saved message until it is dismissed', () => {
		const onclose = vi.fn();
		const t = render({ onclose });
		save(t);
		vi.advanceTimersByTime(5000);
		expect(onclose).not.toHaveBeenCalled();
	});

	it('calls nothing after it is unmounted', () => {
		const onclose = vi.fn();
		const t = render({ onclose });
		save(t);
		unmount(component!);
		component = null;
		vi.advanceTimersByTime(5000);
		expect(onclose).not.toHaveBeenCalled();
	});

	it("closes from the saved message's 'Loka' button", () => {
		const onclose = vi.fn();
		const t = render({ onclose });
		save(t);
		button(t, 'Loka')?.click();
		expect(onclose).toHaveBeenCalledTimes(1);
	});
});

describe('RecallPrompt: Escape', () => {
	it('acts as Sleppa while the box is empty', () => {
		const onclose = vi.fn();
		const t = render({ onclose });
		key(t, { key: 'Escape' });
		expect(onclose).toHaveBeenCalledTimes(1);
	});

	it('does nothing once the box holds text', () => {
		const onclose = vi.fn();
		const t = render({ onclose });
		type(t, 'Hálfskrifað');
		key(t, { key: 'Escape' });
		expect(onclose).not.toHaveBeenCalled();
	});

	it('keeps typed text on Escape', () => {
		const t = render();
		type(t, 'Hálfskrifað');
		key(t, { key: 'Escape' });
		expect(textarea(t).value).toBe('Hálfskrifað');
	});
});

describe('RecallPrompt: touch screens', () => {
	it('focuses the box on a desktop', () => {
		const t = render();
		expect(document.activeElement).toBe(textarea(t));
	});

	it('does not focus the box on a touch screen', () => {
		pointer('coarse');
		const t = render();
		expect(document.activeElement).not.toBe(textarea(t));
	});

	it('shows the Ctrl+Enter hint on a desktop, in the secondary text colour', () => {
		const t = render();
		const hint = [...t.querySelectorAll('span')].find((s) => s.textContent?.includes('Ctrl+Enter'));
		expect(hint?.className).toContain('--text-secondary');
	});

	it('shows no Ctrl+Enter hint on a touch screen', () => {
		pointer('coarse');
		const t = render();
		expect(t.textContent).not.toContain('Ctrl+Enter');
	});
});

describe("RecallPrompt: the one-time 'why' line", () => {
	it('shows it the first time', () => {
		const t = render();
		expect(t.textContent).toContain('Af hverju?');
	});

	it('does not show it once seen', () => {
		localStorage.setItem(WHY_SEEN_KEY, '1');
		const t = render();
		expect(t.textContent).not.toContain('Af hverju?');
	});

	it("marks it seen on 'Sleppa'", () => {
		const t = render();
		button(t, 'Sleppa')?.click();
		expect(localStorage.getItem(WHY_SEEN_KEY)).toBe('1');
	});

	it('marks it seen on a save', () => {
		const t = render();
		save(t);
		expect(localStorage.getItem(WHY_SEEN_KEY)).toBe('1');
	});
});
