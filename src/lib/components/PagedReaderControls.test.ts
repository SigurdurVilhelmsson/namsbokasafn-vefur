/**
 * PagedReaderControls in jsdom (plan step S8.4; register CODE-17, CODE-18, KEEP-03, UI-01).
 *
 * jsdom has no layout, so the harness supplies it: each block's height is its data-h
 * attribute (getBoundingClientRect), matchMedia answers as a desktop (jsdom has none, and
 * init calls it), scrollTo does nothing, document.fonts can hold init at its first await,
 * and img.decode is stubbed where a test has an image (jsdom has no decode, and an
 * <img src> never completes there, so loadImages would throw). Fake timers drive the
 * image wait (1.5 s), the re-split debounce (150 ms) and the announcer's 50 ms gap.
 *
 * Teardown discipline: a test that holds the fonts releases them before its pager is
 * unmounted (afterEach does it too). On main's code before S8.4, a pager unmounted while
 * it waited woke up later with live listeners and stole every later test's keys.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { get } from 'svelte/store';
import { ANNOUNCE_DELAY_MS, announcement } from '$lib/stores/announcer';
import { settings } from '$lib/stores/settings';
import LiveAnnouncer from './LiveAnnouncer.svelte';
import PagedReaderControls from './PagedReaderControls.svelte';
import type { PagerState } from '$lib/utils/pager';

const realRect = Element.prototype.getBoundingClientRect;
const realStyle = window.getComputedStyle;
let fonts: { release: () => void; reject: (e: Error) => void } | null = null;
let mounted: ReturnType<typeof mount>[] = [];

/** Three sub-sections of 3, 2 and 1 pages at jsdom's 768 px window (a 446 px budget) */
function content(): HTMLElement {
	const container = document.body.appendChild(document.createElement('div'));
	const block = (tag: string, h: number) => `<${tag} data-h="${h}">x</${tag}>`;
	const unit = (n: number) => `<section>${block('h2', 40)}${block('p', 300).repeat(n)}</section>`;
	container.innerHTML = `<article class="cnx-module"><main>${unit(3)}${unit(2)}${unit(1)}</main></article>`;
	return container;
}

async function settle() {
	for (let i = 0; i < 30; i++) await Promise.resolve();
	flushSync();
}

function holdFonts() {
	let release = () => {};
	let reject: (e: Error) => void = () => {};
	const ready = new Promise<void>((res, rej) => {
		release = res;
		reject = rej;
	});
	Object.defineProperty(document, 'fonts', { value: { ready }, configurable: true });
	fonts = { release, reject };
	return fonts;
}

function open(container: HTMLElement, props: Record<string, unknown> = {}) {
	const target = document.body.appendChild(document.createElement('div'));
	const states: PagerState[] = [];
	const pager = mount(PagedReaderControls, {
		target,
		props: { container, onstatechange: (s: PagerState) => states.push(s), ...props } as never
	});
	mounted.push(pager);
	flushSync();
	return { pager, states };
}

function drop(pager: ReturnType<typeof mount>) {
	unmount(pager);
	mounted = mounted.filter((m) => m !== pager);
	flushSync();
}

const hidden = (root: ParentNode) => root.querySelectorAll('.cnx-module [hidden]').length;
const nav = () => document.querySelector('nav[aria-label="Síðuflakk"]');
const label = () => document.querySelector('.paged-nav-label')?.textContent?.trim() ?? '';
const key = (k: string) => {
	window.dispatchEvent(new KeyboardEvent('keydown', { key: k, cancelable: true }));
	flushSync();
};

/** A failure inside a re-split, after it measured and split: it throws as it shows the page */
function failNextResplit() {
	const realToggle = Element.prototype.toggleAttribute;
	Element.prototype.toggleAttribute = function () {
		Element.prototype.toggleAttribute = realToggle;
		throw new Error('forced');
	};
	window.dispatchEvent(new Event('resize'));
	vi.advanceTimersByTime(200);
	flushSync();
	Element.prototype.toggleAttribute = realToggle;
}

/** Every input the pager listens to; returns the hidden-block count after each */
function poke(container: HTMLElement): number[] {
	const counts: number[] = [];
	key('ArrowRight');
	counts.push(hidden(container));
	key('PageDown');
	counts.push(hidden(container));
	for (const [type, x] of [
		['touchstart', 300],
		['touchend', 100]
	] as const) {
		const ev = new Event(type) as TouchEvent;
		Object.defineProperty(ev, 'changedTouches', { value: [{ clientX: x, clientY: 0 }] });
		container.dispatchEvent(ev);
	}
	flushSync();
	counts.push(hidden(container));
	history.replaceState(null, '', '#sub-2');
	window.dispatchEvent(new HashChangeEvent('hashchange'));
	flushSync();
	counts.push(hidden(container));
	window.dispatchEvent(new Event('resize'));
	settings.toggleSidebar();
	vi.advanceTimersByTime(200);
	flushSync();
	settings.toggleSidebar();
	counts.push(hidden(container));
	return counts;
}

beforeEach(() => {
	vi.useFakeTimers();
	Element.prototype.getBoundingClientRect = function (this: Element) {
		const h = Number((this as HTMLElement).dataset?.h ?? 0);
		return { top: 0, bottom: h, height: h, left: 0, right: 0, width: 0, x: 0, y: 0, toJSON() {} } as DOMRect;
	};
	window.matchMedia = ((query: string) => ({
		matches: false,
		media: query,
		addEventListener() {},
		removeEventListener() {}
	})) as never;
	window.scrollTo = (() => {}) as never;
	vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
	fonts?.release();
	await settle();
	vi.advanceTimersByTime(1500);
	await settle();
	for (const m of mounted.reverse()) unmount(m);
	mounted = [];
	fonts = null;
	delete (document as unknown as { fonts?: unknown }).fonts;
	document.body.innerHTML = '';
	vi.runOnlyPendingTimers();
	vi.useRealTimers();
	vi.restoreAllMocks();
	Element.prototype.getBoundingClientRect = realRect;
	window.getComputedStyle = realStyle;
	history.replaceState(null, '', '/');
});

describe('the pager reports its state (CODE-17)', () => {
	it("is 'pending' from mount while it waits, with nothing hidden and no key turning a page", async () => {
		holdFonts();
		const c = content();
		const { states } = open(c);
		await settle();
		expect(states).toEqual(['pending']);
		expect(nav()).toBeNull();
		expect(poke(c)).toEqual([0, 0, 0, 0, 0]);
	});

	it("is 'ready' once its keys are live, 'end' after the last 'Næsta', 'ready' a page back, 'end' again", async () => {
		const c = content();
		const oncomplete = vi.fn();
		const { states } = open(c, { oncomplete });
		await settle();
		expect(label()).toBe('Hluti 1 af 3 · Síða 1 af 3');
		const next = () => (document.querySelector('button[aria-label="Næsta síða"]') as HTMLButtonElement).click();
		for (let i = 0; i < 6; i++) {
			next();
			flushSync();
		}
		expect(label()).toBe('Hluti 3 af 3 · Síða 1 af 1');
		expect(oncomplete).toHaveBeenCalledTimes(1);
		key('ArrowLeft');
		key('ArrowRight');
		expect(states).toEqual(['pending', 'ready', 'end', 'ready', 'end']);
		expect(oncomplete).toHaveBeenCalledTimes(1);
	});
});

describe('a failed pager gives the section back (CODE-17, KEEP-03)', () => {
	it('after a failed re-split, a key, a swipe, a hash change and a re-split hide nothing', async () => {
		const c = content();
		const { states } = open(c);
		await settle();
		failNextResplit();
		expect(nav()).toBeNull();
		expect(hidden(c)).toBe(0);
		expect(poke(c)).toEqual([0, 0, 0, 0, 0]);
		expect(states).toEqual(['pending', 'ready', 'failed']);
	});

	it('after a re-split that fails half-way, → throws nothing', async () => {
		const c = content();
		open(c);
		await settle();
		key('PageDown');
		key('PageDown');
		const first = c.querySelector('section')!;
		first.insertAdjacentHTML('beforeend', '<p data-h="300">x</p>');
		window.getComputedStyle = ((el: Element, p?: string | null) => {
			if (c.contains(el) && !first.contains(el)) throw new Error('forced');
			return realStyle(el, p);
		}) as never;
		window.dispatchEvent(new Event('resize'));
		vi.advanceTimersByTime(200);
		flushSync();
		window.getComputedStyle = realStyle;
		const errors: unknown[] = [];
		const onError = (e: ErrorEvent) => errors.push(e.error);
		window.addEventListener('error', onError);
		vi.spyOn(console, 'error').mockImplementation(() => {});
		key('ArrowRight');
		window.removeEventListener('error', onError);
		expect(errors).toEqual([]);
	});

	it('an init that fails after adding some listeners (the observer throws) leaves none turning pages', async () => {
		const c = content();
		const RealMO = window.MutationObserver;
		window.MutationObserver = class {
			constructor() {
				throw new Error('forced');
			}
		} as never;
		try {
			open(c);
			await settle();
		} finally {
			window.MutationObserver = RealMO;
		}
		expect(nav()).toBeNull();
		expect(poke(c)).toEqual([0, 0, 0, 0, 0]);
	});

	it('a re-split that calibrate() starts and that fails stops init before its listeners', async () => {
		const c = content();
		const rect = Element.prototype.getBoundingClientRect;
		Element.prototype.getBoundingClientRect = function (this: Element) {
			if (this.matches('nav.paged-nav')) return { top: 0, bottom: 2000, height: 40 } as DOMRect;
			return rect.call(this);
		};
		window.getComputedStyle = ((el: Element, p?: string | null) => {
			if (document.querySelector('nav.paged-nav') && c.contains(el)) throw new Error('forced');
			return realStyle(el, p);
		}) as never;
		const { states } = open(c);
		await settle();
		window.getComputedStyle = realStyle;
		Element.prototype.getBoundingClientRect = rect;
		// Behaviour first, so main's code fails here on what a reader meets: its key listener,
		// added after the failure, still takes → (and turns nothing: the failed re-split left
		// no pages)
		expect(hidden(c)).toBe(0);
		const arrow = new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true });
		window.dispatchEvent(arrow);
		expect(arrow.defaultPrevented).toBe(false);
		expect(poke(c)).toEqual([0, 0, 0, 0, 0]);
		expect(states).toEqual(['pending', 'failed']);
	});
});

describe('a pager destroyed while it waits (CODE-17: the mode switch during init)', () => {
	it('never hides a block, adds a listener, loads an image eagerly or reports again', async () => {
		const proto = HTMLImageElement.prototype as unknown as { decode?: () => Promise<void> };
		proto.decode = () => new Promise<void>(() => {});
		try {
			const gate = holdFonts();
			const c = content();
			c.querySelector('section p')!.insertAdjacentHTML('afterend', '<img src="/x.png" loading="lazy" data-h="200">');
			const { pager, states } = open(c);
			drop(pager);
			gate.release();
			await settle();
			vi.advanceTimersByTime(1500);
			await settle();
			expect(hidden(c)).toBe(0);
			expect((c.querySelector('img') as HTMLImageElement).loading).not.toBe('eager');
			expect(poke(c)).toEqual([0, 0, 0, 0, 0]);
			expect(states).toEqual(['pending']);
		} finally {
			delete proto.decode;
		}
	});

	it('destroyed in its image wait (where a switch 300 ms after arrival lands), hides nothing', async () => {
		const proto = HTMLImageElement.prototype as unknown as { decode?: () => Promise<void> };
		proto.decode = () => new Promise<void>(() => {});
		try {
			const c = content();
			c.querySelector('section p')!.insertAdjacentHTML('afterend', '<img src="/x.png" loading="lazy" data-h="200">');
			const { pager, states } = open(c);
			await settle(); // past the fonts: waiting up to 1.5 s for the image
			expect(nav()).toBeNull();
			vi.advanceTimersByTime(300);
			drop(pager);
			vi.advanceTimersByTime(1500);
			await settle();
			expect(hidden(c)).toBe(0);
			expect(poke(c)).toEqual([0, 0, 0, 0, 0]);
			expect(states).toEqual(['pending']);
		} finally {
			delete proto.decode;
		}
	});

	it('says nothing and gives nothing back when its wait fails after it is gone', async () => {
		const gate = holdFonts();
		const c = content();
		const { pager, states } = open(c);
		drop(pager);
		gate.reject(new Error('forced'));
		await settle();
		expect(console.warn).not.toHaveBeenCalled();
		expect(states).toEqual(['pending']);
	});

	it('leaves the keys to a pager mounted after it on the same content (switched back on)', async () => {
		const gate = holdFonts();
		const c = content();
		drop(open(c).pager);
		gate.release();
		await settle();
		vi.advanceTimersByTime(1500);
		await settle();
		open(c);
		await settle();
		key('ArrowRight');
		const labels = [...document.querySelectorAll('.paged-nav-label')].map((n) => n.textContent!.trim());
		expect(labels).toEqual(['Hluti 1 af 3 · Síða 2 af 3']);
	});
});

describe('the pager speaks through the shared announcer (S8.3, UI-01)', () => {
	it('adds no live region of its own; the one region says what the label shows, and is cleared on failure', async () => {
		const target = document.body.appendChild(document.createElement('div'));
		mounted.push(mount(LiveAnnouncer, { target }));
		const c = content();
		open(c);
		await settle();
		vi.advanceTimersByTime(ANNOUNCE_DELAY_MS);
		flushSync();
		expect(document.querySelectorAll('[aria-live]')).toHaveLength(1);
		expect(get(announcement)).toBe(label());
		failNextResplit();
		vi.advanceTimersByTime(ANNOUNCE_DELAY_MS);
		expect(get(announcement)).toBe('');
	});
});
