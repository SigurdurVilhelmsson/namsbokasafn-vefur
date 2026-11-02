/**
 * SelectionPopup as a toolbar (reader plan S7.1; register UI-13, PED-31): its role and names,
 * the arrow keys along it with one Tab stop, focus moved in only when asked, and Escape telling
 * its owner whether focus was inside, so focus can go back to the article.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import SelectionPopup from './SelectionPopup.svelte';

let component: ReturnType<typeof mount> | null = null;
let onClose: ReturnType<typeof vi.fn>;
let onHighlight: ReturnType<typeof vi.fn>;

function render(props: Record<string, unknown> = {}) {
	const target = document.body.appendChild(document.createElement('div'));
	component = mount(SelectionPopup, {
		target,
		props: {
			anchor: { left: 180, right: 220, top: 400, bottom: 420 },
			onHighlight,
			onAddNote: () => {},
			onCreateFlashcard: () => {},
			onGlossaryLookup: () => {},
			onClose,
			...props
		} as never
	});
	flushSync();
	return target;
}

const toolbar = (t: HTMLElement) => t.querySelector<HTMLElement>('[role="toolbar"]')!;
const buttons = (t: HTMLElement) => [...toolbar(t).querySelectorAll('button')];
const key = (el: Element, k: string) => {
	el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
	flushSync();
};

beforeEach(() => {
	onClose = vi.fn();
	onHighlight = vi.fn();
});

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.replaceChildren();
});

describe('SelectionPopup', () => {
	it('is a toolbar named Valmöguleikar yfirstrikunar, not a dialog', () => {
		const t = render();
		expect(toolbar(t).getAttribute('aria-label')).toBe('Valmöguleikar yfirstrikunar');
		expect(t.querySelector('[role="dialog"]')).toBeNull();
	});

	it('names each colour in the dative after "með"', () => {
		const t = render();
		expect(buttons(t).slice(0, 4).map((b) => b.getAttribute('aria-label'))).toEqual([
			'Yfirstrika með gulum lit',
			'Yfirstrika með gulbrúnum lit',
			'Yfirstrika með bláum lit',
			'Yfirstrika með rósrauðum lit'
		]);
	});

	it('moves focus to its first button only when asked', () => {
		const outside = document.body.appendChild(document.createElement('button'));
		outside.focus();
		const t = render();
		expect(document.activeElement).toBe(outside);
		unmount(component!);
		component = null;
		const t2 = render({ focusOnOpen: true });
		expect(document.activeElement).toBe(buttons(t2)[0]);
		expect(t).toBeTruthy();
	});

	it('has one Tab stop, which the arrow keys, Home and End move along it, wrapping at the ends', () => {
		const t = render({ focusOnOpen: true });
		const all = buttons(t);
		const stops = () => all.filter((b) => b.tabIndex === 0);
		expect(stops()).toEqual([all[0]]);
		key(all[0], 'ArrowRight');
		expect(document.activeElement).toBe(all[1]);
		expect(stops()).toEqual([all[1]]);
		key(all[1], 'ArrowLeft');
		expect(document.activeElement).toBe(all[0]);
		key(all[0], 'ArrowLeft');
		expect(document.activeElement).toBe(all[all.length - 1]);
		key(all[all.length - 1], 'ArrowRight');
		expect(document.activeElement).toBe(all[0]);
		key(all[0], 'End');
		expect(document.activeElement).toBe(all[all.length - 1]);
		key(all[all.length - 1], 'Home');
		expect(document.activeElement).toBe(all[0]);
		key(all[0], 'ArrowDown');
		expect(document.activeElement).toBe(all[1]);
		key(all[1], 'ArrowUp');
		expect(document.activeElement).toBe(all[0]);
	});

	it('goes on from wherever focus lands in it (a screen reader can focus any of its buttons)', () => {
		const t = render({ focusOnOpen: true });
		const all = buttons(t);
		all[3].focus();
		flushSync();
		expect(all.filter((b) => b.tabIndex === 0)).toEqual([all[3]]);
		key(all[3], 'ArrowRight');
		expect(document.activeElement).toBe(all[4]);
	});

	it("keeps the keys it uses from the page's shortcuts (ArrowRight is the next page)", () => {
		const t = render({ focusOnOpen: true });
		const seen: string[] = [];
		const onWindowKey = (e: KeyboardEvent) => seen.push(e.key);
		window.addEventListener('keydown', onWindowKey);
		try {
			for (const k of ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End']) key(buttons(t)[0], k);
			key(buttons(t)[0], 'Escape');
		} finally {
			window.removeEventListener('keydown', onWindowKey);
		}
		expect(seen).toEqual(['Escape']);
	});

	it('Shift with an arrow, Home or End goes on extending the selection, and focus stays in the toolbar', () => {
		const onExtendSelection = vi.fn();
		const t = render({ focusOnOpen: true, onExtendSelection });
		key(buttons(t)[0], 'ArrowRight');
		const shiftKey = (k: string) => {
			buttons(t)[1].dispatchEvent(new KeyboardEvent('keydown', { key: k, shiftKey: true, bubbles: true, cancelable: true }));
			flushSync();
		};
		for (const k of ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End']) shiftKey(k);
		expect(onExtendSelection.mock.calls.map(([e]) => (e as KeyboardEvent).key)).toEqual([
			'ArrowRight',
			'ArrowLeft',
			'ArrowDown',
			'ArrowUp',
			'Home',
			'End'
		]);
		expect(document.activeElement).toBe(buttons(t)[1]);
	});

	it('runs a colour from the keyboard', () => {
		const t = render({ focusOnOpen: true });
		buttons(t)[2].click();
		expect(onHighlight).toHaveBeenCalledWith('blue');
	});

	it('Escape with focus inside closes it and says focus was inside', () => {
		const t = render({ focusOnOpen: true });
		key(buttons(t)[1], 'Escape');
		expect(onClose).toHaveBeenCalledWith({ hadFocus: true });
	});

	it('Escape with focus elsewhere closes it and says focus was not inside', () => {
		render();
		key(document.body, 'Escape');
		expect(onClose).toHaveBeenCalledWith({ hadFocus: false });
	});

	it('Loka says whether focus was inside', () => {
		const t = render({ focusOnOpen: true });
		const close = buttons(t).find((b) => b.getAttribute('aria-label') === 'Loka')!;
		close.focus();
		close.click();
		expect(onClose).toHaveBeenCalledWith({ hadFocus: true });
	});

	it('keeps the selection when pressed: a mousedown inside it is cancelled', () => {
		const t = render();
		const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
		buttons(t)[0].dispatchEvent(down);
		expect(down.defaultPrevented).toBe(true);
		expect(onClose).not.toHaveBeenCalled();
	});
});
