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

const PAGER_EVENTS = new Set([
	'keydown',
	'hashchange',
	'resize',
	'touchstart',
	'touchend',
	'load',
	'blur',
	'beforeprint',
	'afterprint',
	'beforematch'
]);
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
	listeners: [
		'load',
		'resize',
		'keydown',
		'hashchange',
		'touchstart',
		'touchend',
		'beforeprint',
		'afterprint',
		'beforematch'
	],
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

/**
 * Three sub-sections of 3, 2 and 1 pages in a 446 px budget: the harness's 604 px window less
 * the 8 px content top (no header in jsdom: PAGE_BUDGET.headerGap alone) and the 150 px gap
 * estimate, with no clearance under call 1's step 2 (S9.5). It was jsdom's 768 px window less
 * the fixed 96 px offset and the 76 px clearance before.
 */
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

/** A failure inside a re-split, after it measured and split: it throws as it shows the page,
 *  at the first block it hides */
function failNextResplit() {
	const realSet = Element.prototype.setAttribute;
	Element.prototype.setAttribute = function (this: Element, name: string, value: string) {
		if (name !== 'hidden') return realSet.call(this, name, value);
		Element.prototype.setAttribute = realSet;
		throw new Error('forced');
	};
	window.dispatchEvent(new Event('resize'));
	vi.advanceTimersByTime(200);
	flushSync();
	Element.prototype.setAttribute = realSet;
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

const realInnerHeight = window.innerHeight;

beforeEach(() => {
	vi.useFakeTimers();
	Object.defineProperty(window, 'innerHeight', { value: 604, configurable: true, writable: true });
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
	// jsdom has no scrollIntoView; the pager brings a link's target into view with it (S11.2)
	Element.prototype.scrollIntoView = () => {};
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
	delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
	window.getComputedStyle = realStyle;
	Object.defineProperty(window, 'innerHeight', { value: realInnerHeight, configurable: true, writable: true });
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

// Plan step S9.4 (UI-09, PED-15): the machine-translation notice. The full banner stands above
// the section's first page only (`lead`, in the pager's container above the content), and every
// page's label row carries a compact 'Vélþýtt' marker with 'Tilkynna villu'.
describe('the machine-translation notice (S9.4)', () => {
	function withLead(): { c: HTMLElement; lead: HTMLElement } {
		const c = content();
		const lead = document.createElement('div');
		lead.dataset.h = '120';
		lead.textContent = 'Vélþýtt efni.';
		c.prepend(lead);
		return { c, lead };
	}

	it('shows the banner on the section’s first page only', async () => {
		const { c, lead } = withLead();
		open(c, { lead });
		await settle();
		expect(lead.hasAttribute('hidden')).toBe(false);
		key('ArrowRight');
		expect(lead.hasAttribute('hidden')).toBe(true);
		key('ArrowLeft');
		expect(lead.hasAttribute('hidden')).toBe(false);
	});

	it('gives the banner back when the pager goes', async () => {
		const { c, lead } = withLead();
		const { pager } = open(c, { lead });
		await settle();
		key('ArrowRight');
		drop(pager);
		expect(lead.hasAttribute('hidden')).toBe(false);
	});

	it("puts 'Vélþýtt' and 'Tilkynna villu' in the label row, named for the notice", async () => {
		const c = content();
		open(c, { mtReport: '/feedback?bok=b&kafli=01&hluti=1-1' });
		await settle();
		const marker = nav()!.querySelector<HTMLElement>('[role="note"]');
		expect(marker?.getAttribute('aria-label')).toBe('Vélþýtt efni');
		expect(marker?.textContent).toContain('Vélþýtt');
		expect(marker?.textContent).toContain('Þessi eining hefur ekki enn verið yfirlesin');
		expect(marker?.querySelector('a')?.getAttribute('href')).toBe('/feedback?bok=b&kafli=01&hluti=1-1');
		expect(marker?.querySelector('a')?.textContent?.trim()).toBe('Tilkynna villu');
	});

	it('shows no marker on a reviewed section (no report link given)', async () => {
		const c = content();
		open(c);
		await settle();
		expect(nav()!.querySelector('[role="note"]')).toBeNull();
	});
});

// Plan step S9.4 (PED-03, D12): a 'Mynd' link opens the lightbox over the current page; a table
// link keeps the page jump
describe('figure links (S9.4)', () => {
	function withFigure(): HTMLElement {
		const container = document.body.appendChild(document.createElement('div'));
		const p = (inner = 'x') => `<p data-h="300">${inner}</p>`;
		container.innerHTML =
			'<article class="cnx-module"><main><section>' +
			'<h2 data-h="40">S</h2>' +
			p('<a href="#fig">Mynd 1.2</a> <a href="#tab">Tafla 1.1</a>') +
			p() +
			p() +
			'<figure id="fig" data-h="300"><img src="/x.png" alt="a"><figcaption>Mynd 1.2</figcaption></figure>' +
			'<table id="tab" data-h="100"><tr><td>t</td></tr></table>' +
			'</section></main></article>';
		return container;
	}
	const click = (a: HTMLAnchorElement) => {
		const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
		a.dispatchEvent(event);
		flushSync();
		return event.defaultPrevented;
	};
	const lightbox = () => document.querySelector('[role="dialog"][aria-modal="true"]');

	beforeEach(() => {
		HTMLImageElement.prototype.decode = () => Promise.resolve();
	});
	afterEach(() => {
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		delete (HTMLImageElement.prototype as { decode?: unknown }).decode;
	});

	it("a 'Mynd' link opens the lightbox and keeps the page", async () => {
		const c = withFigure();
		open(c);
		await settle();
		vi.advanceTimersByTime(1500);
		await settle();
		const before = label();
		expect(click(c.querySelector<HTMLAnchorElement>('a[href="#fig"]')!)).toBe(true);
		expect(lightbox()).not.toBeNull();
		expect(label()).toBe(before);
	});

	// Since S11.2 (CODE-10) the pager follows it itself; before, the click went on to SvelteKit
	it('a table link turns to the table, with no lightbox', async () => {
		const c = withFigure();
		open(c);
		await settle();
		vi.advanceTimersByTime(1500);
		await settle();
		expect(click(c.querySelector<HTMLAnchorElement>('a[href="#tab"]')!)).toBe(true);
		expect(lightbox()).toBeNull();
		expect(c.querySelector('#tab')!.closest('[hidden]')).toBeNull();
	});

	it('a failed pager leaves figure links alone', async () => {
		const c = withFigure();
		open(c);
		await settle();
		vi.advanceTimersByTime(1500);
		await settle();
		failNextResplit();
		expect(click(c.querySelector<HTMLAnchorElement>('a[href="#fig"]')!)).toBe(false);
		expect(lightbox()).toBeNull();
	});
});

// Plan step S9.4 (CODE-15): until efni's images carry their sizes (H1), the pager loads the
// images of the part the reader is in and the next, not every figure in the section
describe('lighter images (S9.4)', () => {
	/** Three sub-sections of 3, 2 and 1 pages, each with one lazy image; the last image has its size */
	function withImages(): HTMLElement {
		const c = content();
		c.querySelectorAll('section').forEach((section, i) => {
			const img = document.createElement('img');
			img.src = `/img-${i}.png`;
			img.setAttribute('loading', 'lazy');
			if (i === 2) {
				img.setAttribute('width', '400');
				img.setAttribute('height', '300');
			}
			section.querySelector('p')!.append(img);
		});
		return c;
	}
	const loading = (c: HTMLElement) => Array.from(c.querySelectorAll('img')).map((img) => img.getAttribute('loading'));

	beforeEach(() => {
		HTMLImageElement.prototype.decode = () => Promise.resolve();
	});
	afterEach(() => {
		delete (HTMLImageElement.prototype as { decode?: unknown }).decode;
	});

	it("on arrival loads the first part's images and the next part's, not the rest", async () => {
		const c = withImages();
		c.querySelectorAll('img')[2].removeAttribute('width');
		open(c);
		await settle();
		vi.advanceTimersByTime(1500);
		await settle();
		expect(loading(c)).toEqual(['eager', 'eager', 'lazy']);
	});

	it('a turn into the next part loads the part after it', async () => {
		const c = withImages();
		c.querySelectorAll('img')[2].removeAttribute('width');
		open(c);
		await settle();
		vi.advanceTimersByTime(1500);
		await settle();
		for (let i = 0; i < 3; i++) key('ArrowRight');
		expect(label()).toBe('Hluti 2 af 3 · Síða 1 af 2');
		expect(loading(c)).toEqual(['eager', 'eager', 'eager']);
	});

	it('leaves an image that carries its width and height lazy', async () => {
		const c = withImages();
		history.replaceState(null, '', '#sub-1');
		open(c);
		await settle();
		vi.advanceTimersByTime(1500);
		await settle();
		expect(label()).toBe('Hluti 2 af 3 · Síða 1 af 2');
		expect(loading(c)[2]).toBe('lazy');
	});

	it('arriving by a link to the last part loads that part, not the first', async () => {
		const c = withImages();
		c.querySelectorAll('img')[2].removeAttribute('width');
		history.replaceState(null, '', '#sub-2');
		open(c);
		await settle();
		vi.advanceTimersByTime(1500);
		await settle();
		expect(label()).toBe('Hluti 3 af 3 · Síða 1 af 1');
		expect(loading(c)).toEqual(['lazy', 'lazy', 'eager']);
	});
});

// Plan step S11.1 (CODE-08), under D13's ruling (a): Ctrl+P and 'Prenta kafla' print the whole
// section, not the page on screen, and the browser's find-in-page reaches the other pages through
// hidden="until-found". jsdom knows neither, so a test that needs until-found gives HTMLElement an
// onbeforematch (the pager's feature test) and dispatches the event the browser would.
describe('print and find-in-page (S11.1)', () => {
	afterEach(() => {
		delete (HTMLElement.prototype as { onbeforematch?: unknown }).onbeforematch;
	});
	function withUntilFound() {
		Object.defineProperty(HTMLElement.prototype, 'onbeforematch', { value: null, configurable: true, writable: true });
	}
	const values = (c: HTMLElement) =>
		Array.from(c.querySelectorAll('.cnx-module [hidden]'), (el) => el.getAttribute('hidden'));
	/** The browser's find-in-page has matched text in this hidden element */
	function match(el: Element) {
		el.dispatchEvent(new Event('beforematch', { bubbles: true }));
		flushSync();
	}
	function openLive(c: HTMLElement, extra: Record<string, unknown> = {}) {
		const target = document.body.appendChild(document.createElement('div'));
		const props = liveProps({ container: c, covered: false, ...extra });
		mounted.push(mount(PagedReaderControls, { target, props: props as never }));
		flushSync();
		return props;
	}
	const print = (type: 'beforeprint' | 'afterprint') => {
		window.dispatchEvent(new Event(type));
		flushSync();
	};

	it('hides the other pages with hidden="until-found" where the browser has it', async () => {
		withUntilFound();
		const c = content();
		open(c);
		await settle();
		const v = values(c);
		expect(v.length).toBeGreaterThan(0);
		expect(new Set(v)).toEqual(new Set(['until-found']));
	});

	it('falls back to plain hidden where the browser lacks it (a control)', async () => {
		const c = content();
		open(c);
		await settle();
		expect(new Set(values(c))).toEqual(new Set(['']));
	});

	it('hides every block of a sub-section not on screen, not only its wrapper, so a match names its block', async () => {
		withUntilFound();
		const c = content();
		open(c);
		await settle();
		const later = c.querySelectorAll('section')[1];
		expect(later.hasAttribute('hidden')).toBe(true);
		expect(Array.from(later.children).every((el) => el.hasAttribute('hidden'))).toBe(true);
	});

	it("a match on a later sub-section's block turns to its page, and the address says so", async () => {
		withUntilFound();
		const c = content();
		open(c);
		await settle();
		const last = c.querySelectorAll('section')[2].querySelector('p')!;
		match(last);
		expect(label()).toBe('Hluti 3 af 3 · Síða 1 af 1');
		expect(last.closest('[hidden]')).toBeNull();
		expect(window.location.hash).toBe('#sub-2');
	});

	it('a match on a later page of the same sub-section turns to that page', async () => {
		withUntilFound();
		const c = content();
		open(c);
		await settle();
		match(c.querySelectorAll('section')[0].querySelectorAll('p')[2]);
		expect(label()).toBe('Hluti 1 af 3 · Síða 3 af 3');
	});

	it("a match on a sub-section's wrapper alone turns to that sub-section's first page", async () => {
		withUntilFound();
		const c = content();
		open(c);
		await settle();
		match(c.querySelectorAll('section')[1]);
		expect(label()).toBe('Hluti 2 af 3 · Síða 1 af 2');
	});

	it("a match while the section's end covers the page asks the page to uncover it", async () => {
		withUntilFound();
		const c = content();
		const onuncover = vi.fn();
		const props = openLive(c, { onuncover });
		await settle();
		props.covered = true;
		flushSync();
		match(c.querySelectorAll('section')[0].querySelectorAll('p')[1]);
		expect(onuncover).toHaveBeenCalledTimes(1);
		expect(label()).toBe('Hluti 1 af 3 · Síða 2 af 3');
	});

	it('beforeprint shows every block; afterprint shows the same page again', async () => {
		const c = content();
		open(c);
		await settle();
		key('ArrowRight');
		key('ArrowRight');
		expect(label()).toBe('Hluti 1 af 3 · Síða 3 af 3');
		const before = Array.from(c.querySelectorAll('.cnx-module [hidden]'));
		expect(before.length).toBeGreaterThan(0);
		print('beforeprint');
		expect(hidden(c)).toBe(0);
		print('afterprint');
		expect(label()).toBe('Hluti 1 af 3 · Síða 3 af 3');
		expect(Array.from(c.querySelectorAll('.cnx-module [hidden]'))).toEqual(before);
	});

	it('afterprint returns the window to where it was', async () => {
		const c = content();
		open(c);
		await settle();
		const scrollTo = vi.spyOn(window, 'scrollTo');
		Object.defineProperty(window, 'scrollY', { value: 750, configurable: true });
		try {
			print('beforeprint');
			scrollTo.mockClear();
			print('afterprint');
			expect(scrollTo).toHaveBeenLastCalledWith({ top: 750, behavior: 'instant' });
		} finally {
			delete (window as { scrollY?: unknown }).scrollY;
		}
	});

	it('a re-split asked for while printing waits until afterprint', async () => {
		const c = content();
		open(c);
		await settle();
		print('beforeprint');
		// A third as tall: the first sub-section would fit on one page
		for (const p of c.querySelectorAll<HTMLElement>('p')) p.dataset.h = '100';
		window.dispatchEvent(new Event('resize'));
		vi.advanceTimersByTime(200);
		flushSync();
		expect(hidden(c)).toBe(0);
		expect(label()).toBe('Hluti 1 af 3 · Síða 1 af 3');
		print('afterprint');
		expect(label()).toBe('Hluti 1 af 3 · Síða 1 af 1');
		expect(hidden(c)).toBeGreaterThan(0);
	});

	it("covered by the section's end, afterprint hides the page again", async () => {
		const c = content();
		const props = openLive(c);
		await settle();
		props.covered = true;
		flushSync();
		print('beforeprint');
		expect(hidden(c)).toBe(0);
		print('afterprint');
		expect(Array.from(c.querySelectorAll('.cnx-module p')).every((p) => p.closest('[hidden]'))).toBe(true);
	});
});

// Plan step S11.2 (UI-10, CODE-10, CODE-16): the pager reports where the reader is, for the
// sidebar's ring; addresses a page past a unit's first by its first block's id, which opens the
// page holding that block under any window; and follows in-content links itself, since SvelteKit
// short-circuits a second click on a link whose hash it saw last.
describe('position, address and links (S11.2)', () => {
	/** content() with an id on every paragraph ('p-U-I'), and optionally a link in the first */
	function withIds({ link = '' } = {}): HTMLElement {
		const c = content();
		c.querySelectorAll('section').forEach((section, u) =>
			section.querySelectorAll('p').forEach((p, i) => (p.id = `p-${u}-${i}`))
		);
		if (link) c.querySelector('p')!.innerHTML = `<a href="${link}">tafla</a>`;
		return c;
	}
	function click(el: Element): MouseEvent {
		const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
		el.dispatchEvent(event);
		flushSync();
		return event;
	}

	it('reports the position on arrival and on each turn', async () => {
		const onposition = vi.fn();
		open(content(), { onposition });
		await settle();
		expect(onposition).toHaveBeenLastCalledWith({ unit: 0, units: 3, page: 0, pages: 3, index: 0, total: 6 });
		key('ArrowRight');
		expect(onposition).toHaveBeenLastCalledWith({ unit: 0, units: 3, page: 1, pages: 3, index: 1, total: 6 });
		for (let i = 0; i < 4; i++) key('ArrowRight');
		expect(onposition).toHaveBeenLastCalledWith({ unit: 2, units: 3, page: 0, pages: 1, index: 5, total: 6 });
	});

	it("addresses a page past a unit's first by its first block's id", async () => {
		open(withIds());
		await settle();
		key('ArrowRight');
		expect(window.location.hash).toBe('#p-0-1');
		key('ArrowRight');
		expect(window.location.hash).toBe('#p-0-2');
	});

	it("keeps '#sub-U' for a unit's first page and the bare URL for the section's", async () => {
		open(withIds());
		await settle();
		for (let i = 0; i < 3; i++) key('ArrowRight');
		expect(window.location.hash).toBe('#sub-1');
		for (let i = 0; i < 3; i++) key('ArrowLeft');
		expect(window.location.hash).toBe('');
	});

	it('uses an id inside the first block when the block has none', async () => {
		const c = content();
		c.querySelectorAll('section')[0].querySelectorAll('p')[1].innerHTML = 'x <span id="inner">y</span>';
		open(c);
		await settle();
		key('ArrowRight');
		expect(window.location.hash).toBe('#inner');
	});

	it("falls back to '#sub-U-p-P' when the page's first block carries no id (a control)", async () => {
		open(content());
		await settle();
		key('ArrowRight');
		expect(window.location.hash).toBe('#sub-0-p-1');
	});

	it('says which hashes are its page addresses, for the switch to scrolling', async () => {
		const { pager } = open(withIds());
		await settle();
		key('ArrowRight');
		const api = pager as unknown as { isPageHash: (hash: string) => boolean };
		expect(api.isPageHash('#p-0-1')).toBe(true);
		expect(api.isPageHash('#sub-0-p-1')).toBe(true);
		expect(api.isPageHash('#p-2-0')).toBe(false);
		expect(api.isPageHash('')).toBe(false);
	});

	it('takes a click on an in-content link to another page itself: the page turns and the address names the target', async () => {
		const c = withIds({ link: '#p-2-0' });
		open(c);
		await settle();
		const event = click(c.querySelector('a')!);
		expect(event.defaultPrevented).toBe(true);
		expect(label()).toBe('Hluti 3 af 3 · Síða 1 af 1');
		expect(window.location.hash).toBe('#p-2-0');
	});

	it('a second click on the same link, after turning back, turns again', async () => {
		const c = withIds({ link: '#p-2-0' });
		open(c);
		await settle();
		click(c.querySelector('a')!);
		for (let i = 0; i < 5; i++) key('ArrowLeft');
		expect(label()).toBe('Hluti 1 af 3 · Síða 1 af 3');
		const event = click(c.querySelector('a')!);
		expect(event.defaultPrevented).toBe(true);
		expect(label()).toBe('Hluti 3 af 3 · Síða 1 af 1');
	});

	it('leaves a link to something outside the pages to the browser', async () => {
		const c = withIds({ link: '#nowhere' });
		open(c);
		await settle();
		expect(click(c.querySelector('a')!).defaultPrevented).toBe(false);
	});

	it("back to the bare URL, the address of the section's first page, opens that page", async () => {
		open(content());
		await settle();
		for (let i = 0; i < 3; i++) key('ArrowRight');
		history.replaceState(null, '', window.location.pathname);
		window.dispatchEvent(new HashChangeEvent('hashchange'));
		flushSync();
		expect(label()).toBe('Hluti 1 af 3 · Síða 1 af 3');
	});

	it('a fragment navigation that reveals its target keeps the address it names', async () => {
		Object.defineProperty(HTMLElement.prototype, 'onbeforematch', { value: null, configurable: true, writable: true });
		try {
			const c = withIds();
			open(c);
			await settle();
			const block = c.querySelector<HTMLElement>('#p-2-0')!;
			// The browser follows '#p-2-0': the address changes first, then the target is revealed
			history.replaceState(null, '', '#p-2-0');
			block.dispatchEvent(new Event('beforematch', { bubbles: true }));
			flushSync();
			expect(label()).toBe('Hluti 3 af 3 · Síða 1 af 1');
			expect(window.location.hash).toBe('#p-2-0');
		} finally {
			delete (HTMLElement.prototype as { onbeforematch?: unknown }).onbeforematch;
		}
	});
});
