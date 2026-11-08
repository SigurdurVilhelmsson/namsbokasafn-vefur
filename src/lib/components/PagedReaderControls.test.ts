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
 *
 * Release is tested directly, not through a later test (S8.4's review): track() records
 * every listener of the kinds the pager adds, with its signal, every settings subscription
 * and every MutationObserver, and held() says which of them are still live. Without it the
 * guards in next(), prev() and the hash handler hid a leaked listener, and only a leak into
 * the next test showed it.
 *
 * One way jsdom is stricter than a browser: vitest leaves Node's AbortController in place
 * and converts each signal for jsdom on first use, so a listener added with a signal that
 * is ALREADY aborted stays attached, where a browser never attaches it. The current code
 * never does that; a mutant that drops one of init's abort checks can, so such a mutant
 * fails here through a listener a browser would not have.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { get } from 'svelte/store';
import { ANNOUNCE_DELAY_MS, announcement } from '$lib/stores/announcer';
import { settings } from '$lib/stores/settings';
import LiveAnnouncer from './LiveAnnouncer.svelte';
import { liveProps } from './testProps.svelte.js';
import PagedReaderControls from './PagedReaderControls.svelte';
import type { PagerState } from '$lib/utils/pager';

const realRect = Element.prototype.getBoundingClientRect;
const realStyle = window.getComputedStyle;
let fonts: { release: () => void; reject: (e: Error) => void } | null = null;
let mounted: ReturnType<typeof mount>[] = [];

const PAGER_EVENTS = new Set(['keydown', 'hashchange', 'resize', 'touchstart', 'touchend', 'load', 'blur']);
const realAdd = window.EventTarget.prototype.addEventListener;
// vitest's jsdom global is the window, with addEventListener as its own property
const realWindowAdd = window.addEventListener;
const RealObserver = window.MutationObserver;
let added: { type: string; signal: AbortSignal | undefined }[] = [];
let subscriptions: { ended: boolean }[] = [];
let observers: { disconnected: boolean }[] = [];

/** Record what the pager adds from here on: listeners of its kinds, settings subscriptions, observers */
function track() {
	const recording = (add: typeof realAdd) =>
		function (
			this: EventTarget,
			type: string,
			listener: EventListenerOrEventListenerObject | null,
			options?: boolean | AddEventListenerOptions
		) {
			if (PAGER_EVENTS.has(type)) added.push({ type, signal: typeof options === 'object' ? options.signal : undefined });
			return add.call(this, type, listener, options);
		};
	window.EventTarget.prototype.addEventListener = recording(realAdd);
	window.addEventListener = recording(realWindowAdd) as typeof window.addEventListener;
	const subscribe = settings.subscribe;
	vi.spyOn(settings, 'subscribe').mockImplementation((run, invalidate) => {
		const record = { ended: false };
		subscriptions.push(record);
		const unsubscribe = subscribe(run, invalidate);
		return () => {
			record.ended = true;
			unsubscribe();
		};
	});
	window.MutationObserver = class extends RealObserver {
		private record = { disconnected: false };
		constructor(callback: MutationCallback) {
			super(callback);
			observers.push(this.record);
		}
		disconnect() {
			this.record.disconnected = true;
			super.disconnect();
		}
	};
}

/** What the pager added and still holds: listeners with no signal or a live one, open subscriptions, connected observers */
function held() {
	return {
		listeners: added.filter((a) => !a.signal?.aborted).map((a) => a.type),
		subscriptions: subscriptions.filter((r) => !r.ended).length,
		observers: observers.filter((r) => !r.disconnected).length
	};
}
const NOTHING_HELD = { listeners: [], subscriptions: 0, observers: 0 };
const LIVE_PAGER = {
	listeners: ['load', 'resize', 'keydown', 'hashchange', 'touchstart', 'touchend'],
	subscriptions: 1,
	observers: 1
};

/** The page-turn keys the pager took (preventDefault): none, once it has failed or gone */
function keysTaken(): string[] {
	return ['ArrowRight', ' ', 'PageDown'].filter((k) => {
		const event = new KeyboardEvent('keydown', { key: k, cancelable: true });
		window.dispatchEvent(event);
		return event.defaultPrevented;
	});
}

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
	window.EventTarget.prototype.addEventListener = realAdd;
	window.addEventListener = realWindowAdd;
	window.MutationObserver = RealObserver;
	added = [];
	subscriptions = [];
	observers = [];
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
		for (let i = 0; i < 5; i++) {
			next();
			flushSync();
		}
		// The last page's button finishes the section (S9.3, UI-20)
		(document.querySelector('button[aria-label="Ljúka kafla"]') as HTMLButtonElement).click();
		flushSync();
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

describe('a pager lets go of everything it added (CODE-17; S8.4 review)', () => {
	it('after a failed re-split: no listener, subscription or observer left, and no key taken', async () => {
		track();
		const c = content();
		open(c);
		await settle();
		// The control: a live pager holds them all and takes the keys
		expect(held()).toEqual(LIVE_PAGER);
		expect(keysTaken()).toEqual(['ArrowRight', ' ', 'PageDown']);
		history.replaceState(null, '', '/');
		failNextResplit();
		expect(held()).toEqual(NOTHING_HELD);
		expect(keysTaken()).toEqual([]);
	});

	it('unmounted while live: nothing left, and no key taken', async () => {
		track();
		const { pager } = open(content());
		await settle();
		expect(held()).toEqual(LIVE_PAGER);
		drop(pager);
		expect(held()).toEqual(NOTHING_HELD);
		expect(keysTaken()).toEqual([]);
	});

	it('an init that fails after adding its listeners (the observer throws) lets go of them', async () => {
		track();
		const Tracking = window.MutationObserver;
		window.MutationObserver = class {
			constructor() {
				throw new Error('forced');
			}
		} as never;
		try {
			open(content());
			await settle();
		} finally {
			window.MutationObserver = Tracking;
		}
		expect(added.map((a) => a.type)).toEqual(LIVE_PAGER.listeners);
		expect(held()).toEqual(NOTHING_HELD);
		expect(keysTaken()).toEqual([]);
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
	it('adds no live region of its own; the one region says the position and sub-section, and is cleared on failure', async () => {
		const target = document.body.appendChild(document.createElement('div'));
		mounted.push(mount(LiveAnnouncer, { target }));
		const c = content();
		open(c);
		await settle();
		vi.advanceTimersByTime(ANNOUNCE_DELAY_MS);
		flushSync();
		expect(document.querySelectorAll('[aria-live]')).toHaveLength(1);
		// Since S9.2 it names the sub-section (the fixture's headings read 'x')
		expect(label()).toBe('Hluti 1 af 3 · Síða 1 af 3');
		expect(get(announcement)).toBe('Hluti 1 af 3: x, síða 1 af 3');
		failNextResplit();
		vi.advanceTimersByTime(ANNOUNCE_DELAY_MS);
		expect(get(announcement)).toBe('');
	});
});

// Plan step S9.2 (UI-01, UI-05): a key or swipe turn that hides the focused element, or
// finds focus on <body>, moves focus to the article, which holds a tabindex only while it
// has focus (as TextHighlighter's focusArticle() does). 'Fyrri' and 'Næsta' keep their
// focus for repeated presses (reader plan line 209).
describe('a key or swipe turn keeps focus on the page (S9.2, UI-01)', () => {
	const article = () => document.querySelector<HTMLElement>('article.cnx-module')!;
	/** The content, with a focusable term in the first paragraph of page 1 */
	function withTerm(): { c: HTMLElement; term: HTMLElement } {
		const c = content();
		c.querySelector('p')!.innerHTML = '<dfn class="term" tabindex="0">t</dfn>';
		return { c, term: c.querySelector<HTMLElement>('dfn')! };
	}
	function swipeLeft(c: HTMLElement) {
		for (const [type, x] of [
			['touchstart', 300],
			['touchend', 100]
		] as const) {
			const ev = new Event(type) as TouchEvent;
			Object.defineProperty(ev, 'changedTouches', { value: [{ clientX: x, clientY: 0 }] });
			Object.defineProperty(ev, 'touches', { value: [] });
			c.dispatchEvent(ev);
		}
		flushSync();
	}

	it('→ that hides the focused term moves focus to the article', async () => {
		const { c, term } = withTerm();
		open(c);
		await settle();
		term.focus();
		key('ArrowRight');
		expect(label()).toBe('Hluti 1 af 3 · Síða 2 af 3');
		expect(document.activeElement).toBe(article());
	});

	it('a swipe that hides the focused term moves focus to the article', async () => {
		const { c, term } = withTerm();
		open(c);
		await settle();
		term.focus();
		swipeLeft(c);
		expect(label()).toBe('Hluti 1 af 3 · Síða 2 af 3');
		expect(document.activeElement).toBe(article());
	});

	it('→ with focus on <body> moves focus to the article', async () => {
		const c = content();
		open(c);
		await settle();
		(document.activeElement as HTMLElement | null)?.blur();
		expect(document.activeElement).toBe(document.body);
		key('ArrowRight');
		expect(document.activeElement).toBe(article());
	});

	it('the article holds tabindex="-1" only while it has focus', async () => {
		const { c, term } = withTerm();
		open(c);
		await settle();
		expect(article().hasAttribute('tabindex')).toBe(false);
		term.focus();
		key('ArrowRight');
		expect(article().getAttribute('tabindex')).toBe('-1');
		(document.querySelector('button[aria-label="Næsta síða"]') as HTMLElement).focus();
		expect(article().hasAttribute('tabindex')).toBe(false);
	});

	it("'Næsta' keeps its focus, clicked or with → pressed on it", async () => {
		const c = content();
		open(c);
		await settle();
		const next = document.querySelector<HTMLButtonElement>('button[aria-label="Næsta síða"]')!;
		next.focus();
		next.click();
		flushSync();
		key('ArrowRight');
		expect(label()).toBe('Hluti 1 af 3 · Síða 3 af 3');
		expect(document.activeElement).toBe(next);
	});

	it('a pager that fails leaves no tabindex on the article', async () => {
		const { c, term } = withTerm();
		open(c);
		await settle();
		term.focus();
		key('ArrowRight');
		failNextResplit();
		expect(article().hasAttribute('tabindex')).toBe(false);
	});

	// Every listener the pager adds takes its run's signal (CODE-17), the article's blur too
	for (const end of ['fails', 'is unmounted'] as const) {
		it(`the article's blur listener goes with the run when the pager ${end}`, async () => {
			track();
			const { c, term } = withTerm();
			const { pager } = open(c);
			await settle();
			term.focus();
			key('ArrowRight');
			expect(held().listeners).toContain('blur');
			if (end === 'fails') failNextResplit();
			else drop(pager);
			expect(held().listeners).not.toContain('blur');
		});
	}

	it('an unmounted pager leaves no tabindex on the article', async () => {
		const { c, term } = withTerm();
		const { pager } = open(c);
		await settle();
		term.focus();
		key('ArrowRight');
		drop(pager);
		expect(article().hasAttribute('tabindex')).toBe(false);
	});
});

// Plan step S9.3 (UI-20, UI-21): the last page's button says it finishes the section, and while
// the section's end (the recall prompt) is open the pager hides the page in its place
describe("the section's end (S9.3)", () => {
	const button = (name: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`);
	const shown = (c: HTMLElement) =>
		Array.from(c.querySelectorAll<HTMLElement>('.cnx-module p, .cnx-module h2')).filter(
			(el) => !el.closest('[hidden]')
		).length;
	function openLive(c: HTMLElement, extra: Record<string, unknown> = {}) {
		const target = document.body.appendChild(document.createElement('div'));
		const props = liveProps({ container: c, covered: false, ...extra });
		const pager = mount(PagedReaderControls, { target, props: props as never });
		mounted.push(pager);
		flushSync();
		return props;
	}
	async function toLastPage() {
		for (let i = 0; i < 5; i++) {
			button('Næsta síða')!.click();
			flushSync();
		}
	}

	it("labels the last page's button 'Ljúka kafla', and every other page's 'Næsta'", async () => {
		const c = content();
		open(c);
		await settle();
		expect(button('Næsta síða')?.textContent?.trim()).toBe('Næsta');
		expect(button('Ljúka kafla')).toBeNull();
		await toLastPage();
		expect(label()).toBe('Hluti 3 af 3 · Síða 1 af 1');
		expect(button('Næsta síða')).toBeNull();
		expect(button('Ljúka kafla')?.textContent?.trim()).toBe('Ljúka kafla');
	});

	it('covered, it hides the page and keeps the label; uncovered, it shows the page again', async () => {
		const c = content();
		const props = openLive(c);
		await settle();
		await toLastPage();
		expect(shown(c)).toBe(2);
		props.covered = true;
		flushSync();
		expect(shown(c)).toBe(0);
		expect(label()).toBe('Hluti 3 af 3 · Síða 1 af 1');
		props.covered = false;
		flushSync();
		expect(shown(c)).toBe(2);
	});

	it("'Fyrri' and ← while covered ask the page to uncover, and turn no page", async () => {
		const c = content();
		const onuncover = vi.fn();
		const props = openLive(c, { onuncover });
		await settle();
		await toLastPage();
		props.covered = true;
		flushSync();
		button('Fyrri síða')!.click();
		key('ArrowLeft');
		expect(onuncover).toHaveBeenCalledTimes(2);
		expect(label()).toBe('Hluti 3 af 3 · Síða 1 af 1');
	});

	it('a resize while covered re-splits only once uncovered, so the label holds', async () => {
		const c = content();
		const props = openLive(c);
		await settle();
		props.covered = true;
		flushSync();
		// A third as tall: the first sub-section would fit on one page
		for (const p of c.querySelectorAll<HTMLElement>('p')) p.dataset.h = '100';
		window.dispatchEvent(new Event('resize'));
		vi.advanceTimersByTime(200);
		flushSync();
		expect(label()).toBe('Hluti 1 af 3 · Síða 1 af 3');
		props.covered = false;
		flushSync();
		expect(label()).toBe('Hluti 1 af 3 · Síða 1 af 1');
	});
});

// Plan step S9.3 (UI-05, PED-01, CODE-07): the in-view way out. The pager names the block its
// page starts with, so the section page can keep it in view across a switch to scrolling;
// opens the page holding a given block on the way back; and offers 'Samfellt skrun' in the
// label row.
describe('the way out (S9.3)', () => {
	type WithAnchor = { shownAnchor: () => HTMLElement | null };
	const blocks = (c: HTMLElement) => Array.from(c.querySelectorAll<HTMLElement>('.cnx-module h2, .cnx-module p'));

	it('shownAnchor() names the first block of the page shown, and follows a turn', async () => {
		const c = content();
		const { pager } = open(c);
		await settle();
		expect((pager as unknown as WithAnchor).shownAnchor()).toBe(blocks(c)[0]);
		key('ArrowRight');
		// Page 2 of the first sub-section starts with its second paragraph
		expect((pager as unknown as WithAnchor).shownAnchor()).toBe(blocks(c)[2]);
	});

	it('opens the page holding startAt, ahead of a page hash', async () => {
		history.replaceState(null, '', '#sub-0-p-2');
		const c = content();
		// The second sub-section's second paragraph: its page 2
		const start = c.querySelectorAll('section')[1].querySelectorAll('p')[1] as HTMLElement;
		open(c, { startAt: start });
		await settle();
		expect(label()).toBe('Hluti 2 af 3 · Síða 2 af 2');
	});

	it("offers 'Samfellt skrun' in the label row when given onleave, not pressed", async () => {
		const c = content();
		const onleave = vi.fn();
		open(c, { onleave });
		await settle();
		const leave = nav()!.querySelector<HTMLButtonElement>('button[aria-pressed]');
		expect(leave?.textContent?.trim()).toBe('Samfellt skrun');
		expect(leave?.getAttribute('aria-pressed')).toBe('false');
		leave!.click();
		expect(onleave).toHaveBeenCalledTimes(1);
	});

	it('offers no switch without onleave', async () => {
		const c = content();
		open(c);
		await settle();
		expect(nav()!.querySelector('button[aria-pressed]')).toBeNull();
	});
});
