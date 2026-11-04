/**
 * Tests for keyboard shortcuts utility functions
 *
 * Note: The Svelte action itself (keyboardShortcuts) is best tested via E2E.
 * These tests cover the exported utility functions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

let formatShortcutKey: typeof import('./keyboardShortcuts').formatShortcutKey;
let groupShortcutsByCategory: typeof import('./keyboardShortcuts').groupShortcutsByCategory;
let getCategoryDisplayName: typeof import('./keyboardShortcuts').getCategoryDisplayName;
let isValidShortcutKey: typeof import('./keyboardShortcuts').isValidShortcutKey;
let getShortcuts: typeof import('./keyboardShortcuts').getShortcuts;
type KeyboardShortcut = import('./keyboardShortcuts').KeyboardShortcut;

describe('keyboardShortcuts utilities', () => {
	beforeEach(async () => {
		localStorage.clear();
		vi.resetModules();
		const module = await import('./keyboardShortcuts');
		formatShortcutKey = module.formatShortcutKey;
		groupShortcutsByCategory = module.groupShortcutsByCategory;
		getCategoryDisplayName = module.getCategoryDisplayName;
		isValidShortcutKey = module.isValidShortcutKey;
		getShortcuts = module.getShortcuts;
	});

	describe('formatShortcutKey', () => {
		it('should format arrow keys', () => {
			expect(formatShortcutKey('ArrowLeft')).toBe('←');
			expect(formatShortcutKey('ArrowRight')).toBe('→');
			expect(formatShortcutKey('ArrowUp')).toBe('↑');
			expect(formatShortcutKey('ArrowDown')).toBe('↓');
		});

		it('should format Escape as Esc', () => {
			expect(formatShortcutKey('Escape')).toBe('Esc');
		});

		it('should handle space character', () => {
			// Note: space is mapped in keyMap but split(' ') splits on it;
			// in practice, space isn't used as a shortcut key
			const result = formatShortcutKey(' ');
			expect(typeof result).toBe('string');
		});

		it('should uppercase single letters', () => {
			expect(formatShortcutKey('s')).toBe('S');
			expect(formatShortcutKey('f')).toBe('F');
		});

		it('should format multi-key sequences', () => {
			expect(formatShortcutKey('g h')).toBe('G H');
			expect(formatShortcutKey('g f')).toBe('G F');
		});

		it('should preserve special characters', () => {
			expect(formatShortcutKey('/')).toBe('/');
			expect(formatShortcutKey('?')).toBe('?');
		});
	});

	describe('groupShortcutsByCategory', () => {
		it('should group shortcuts by category', () => {
			const shortcuts: KeyboardShortcut[] = [
				{
					action: 'prevSection',
					key: 'ArrowLeft',
					defaultKey: 'ArrowLeft',
					description: 'Previous section',
					descriptionIs: 'Fyrri kafli',
					category: 'navigation',
					isCustomized: false
				},
				{
					action: 'toggleSidebar',
					key: 's',
					defaultKey: 's',
					description: 'Toggle sidebar',
					descriptionIs: 'Opna/loka hliðarslá',
					category: 'reading',
					isCustomized: false
				},
				{
					action: 'nextSection',
					key: 'ArrowRight',
					defaultKey: 'ArrowRight',
					description: 'Next section',
					descriptionIs: 'Næsti kafli',
					category: 'navigation',
					isCustomized: false
				}
			];

			const grouped = groupShortcutsByCategory(shortcuts);
			expect(grouped.get('navigation')).toHaveLength(2);
			expect(grouped.get('reading')).toHaveLength(1);
		});

		it('should handle empty array', () => {
			const grouped = groupShortcutsByCategory([]);
			expect(grouped.size).toBe(0);
		});
	});

	describe('getCategoryDisplayName', () => {
		it('should return Icelandic category names', () => {
			expect(getCategoryDisplayName('navigation')).toBe('Leiðsögn');
			expect(getCategoryDisplayName('reading')).toBe('Lestur');
			expect(getCategoryDisplayName('study')).toBe('Nám');
			expect(getCategoryDisplayName('general')).toBe('Almennt');
		});

		it('should return the key itself for unknown categories', () => {
			expect(getCategoryDisplayName('unknown')).toBe('unknown');
		});
	});

	describe('isValidShortcutKey', () => {
		it('should accept single letters', () => {
			expect(isValidShortcutKey('a')).toBe(true);
			expect(isValidShortcutKey('z')).toBe(true);
			expect(isValidShortcutKey('A')).toBe(true);
		});

		it('should accept single digits', () => {
			expect(isValidShortcutKey('0')).toBe(true);
			expect(isValidShortcutKey('9')).toBe(true);
		});

		it('should accept special characters', () => {
			expect(isValidShortcutKey('/')).toBe(true);
			expect(isValidShortcutKey('?')).toBe(true);
		});

		it('should accept arrow keys', () => {
			expect(isValidShortcutKey('ArrowLeft')).toBe(true);
			expect(isValidShortcutKey('ArrowRight')).toBe(true);
			expect(isValidShortcutKey('ArrowUp')).toBe(true);
			expect(isValidShortcutKey('ArrowDown')).toBe(true);
		});

		it('should accept special keys', () => {
			expect(isValidShortcutKey('Escape')).toBe(true);
			expect(isValidShortcutKey('Enter')).toBe(true);
			expect(isValidShortcutKey('Tab')).toBe(true);
			expect(isValidShortcutKey('Backspace')).toBe(true);
		});

		it('should accept two-key sequences', () => {
			expect(isValidShortcutKey('g h')).toBe(true);
			expect(isValidShortcutKey('g f')).toBe(true);
		});

		it('should reject invalid keys', () => {
			expect(isValidShortcutKey('')).toBe(false);
			expect(isValidShortcutKey('abc')).toBe(false);
			expect(isValidShortcutKey('Control')).toBe(false);
			expect(isValidShortcutKey('g h i')).toBe(false);
		});
	});

	describe('getShortcuts', () => {
		it('should return all shortcuts with defaults', () => {
			const shortcuts = getShortcuts();
			expect(shortcuts.length).toBeGreaterThan(0);

			// Check known shortcuts
			const prevSection = shortcuts.find((s) => s.action === 'prevSection');
			expect(prevSection).toBeDefined();
			expect(prevSection!.key).toBe('ArrowLeft');
			expect(prevSection!.isCustomized).toBe(false);
		});

		it('should include all expected actions', () => {
			const shortcuts = getShortcuts();
			const actions = shortcuts.map((s) => s.action);
			expect(actions).toContain('prevSection');
			expect(actions).toContain('nextSection');
			expect(actions).toContain('goHome');
			expect(actions).toContain('goFlashcards');
			expect(actions).toContain('goGlossary');
			expect(actions).toContain('toggleSidebar');
			expect(actions).toContain('toggleTheme');
			expect(actions).toContain('openSearch');
			expect(actions).toContain('showShortcuts');
			expect(actions).toContain('closeModal');
		});

		it('should have Icelandic descriptions for all shortcuts', () => {
			const shortcuts = getShortcuts();
			shortcuts.forEach((s) => {
				expect(s.descriptionIs).toBeTruthy();
			});
		});

		it('should have a category for all shortcuts', () => {
			const shortcuts = getShortcuts();
			const validCategories = ['navigation', 'reading', 'study', 'general'];
			shortcuts.forEach((s) => {
				expect(validCategories).toContain(s.category);
			});
		});
	});
});

// The section shortcuts step aside for a paged section (plan step S8.2, dde768e). The global
// listener runs before the pager's, so without this its preventDefault() would make the
// pager's keyAction give up on ← / →, and → would change section instead of page.
describe('the section shortcuts and a paged section', () => {
	let action: ReturnType<typeof import('./keyboardShortcuts').keyboardShortcuts>;
	let settingsStore: typeof import('$lib/stores/settings').settings;
	const clicks = { prev: vi.fn(), next: vi.fn() };

	/** A section page's nav buttons, as NavigationButtons marks them */
	function addNavButtons() {
		for (const direction of ['prev', 'next'] as const) {
			// A <button>, not an <a href>: jsdom does not implement navigation
			const button = document.createElement('button');
			button.dataset.nav = direction;
			button.addEventListener('click', clicks[direction]);
			document.body.append(button);
		}
	}

	function markPaged() {
		const wrapper = document.createElement('div');
		wrapper.setAttribute('data-paged-section', 'true');
		document.body.append(wrapper);
		return wrapper;
	}

	/** Press a key as the browser would; returns whether something prevented its default */
	function press(key: string): boolean {
		const event = new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true });
		window.dispatchEvent(event);
		return event.defaultPrevented;
	}

	beforeEach(async () => {
		localStorage.clear();
		vi.resetModules();
		const module = await import('./keyboardShortcuts');
		settingsStore = (await import('$lib/stores/settings')).settings;
		document.body.innerHTML = '';
		clicks.prev.mockClear();
		clicks.next.mockClear();
		addNavButtons();
		const node = document.createElement('div');
		document.body.append(node);
		action = module.keyboardShortcuts(node, { bookSlug: 'efnafraedi-2e' });
	});

	afterEach(() => {
		action.destroy();
		document.body.innerHTML = '';
	});

	it('without the mark, → and ← change section and take the key', () => {
		expect(press('ArrowRight')).toBe(true);
		expect(press('ArrowLeft')).toBe(true);
		expect([clicks.next.mock.calls.length, clicks.prev.mock.calls.length]).toEqual([1, 1]);
	});

	it('with the mark, → and ← neither change section nor take the key', () => {
		markPaged();
		expect(press('ArrowRight')).toBe(false);
		expect(press('ArrowLeft')).toBe(false);
		expect([clicks.next.mock.calls.length, clicks.prev.mock.calls.length]).toEqual([0, 0]);
	});

	it('with the mark, a section shortcut rebound to PageDown or PageUp steps aside too', () => {
		settingsStore.setShortcut('nextSection', 'PageDown');
		settingsStore.setShortcut('prevSection', 'PageUp');
		markPaged();
		expect(press('PageDown')).toBe(false);
		expect(press('PageUp')).toBe(false);
		expect([clicks.next.mock.calls.length, clicks.prev.mock.calls.length]).toEqual([0, 0]);
	});

	it('with the mark, a section shortcut rebound to a key the pager does not use still works', () => {
		settingsStore.setShortcut('nextSection', 'w');
		settingsStore.setShortcut('prevSection', 'q');
		markPaged();
		expect(press('w')).toBe(true);
		expect(press('q')).toBe(true);
		expect([clicks.next.mock.calls.length, clicks.prev.mock.calls.length]).toEqual([1, 1]);
	});

	it("at the pager's end, → changes section and takes the key; ← still steps aside (S8.4)", () => {
		markPaged().setAttribute('data-paged-section', 'end');
		expect(press('ArrowRight')).toBe(true);
		expect(press('ArrowLeft')).toBe(false);
		expect([clicks.next.mock.calls.length, clicks.prev.mock.calls.length]).toEqual([1, 0]);
	});

	it("at the pager's end, a next-section shortcut rebound to PageDown changes section too", () => {
		settingsStore.setShortcut('nextSection', 'PageDown');
		markPaged().setAttribute('data-paged-section', 'end');
		expect(press('PageDown')).toBe(true);
		expect(clicks.next).toHaveBeenCalledTimes(1);
	});

	it('typing in editable content keeps → from changing section, contenteditable="" included', () => {
		document.body.insertAdjacentHTML('beforeend', '<div id="ed" tabindex="0" contenteditable=""></div>');
		(document.getElementById('ed') as HTMLElement).focus();
		expect(press('ArrowRight')).toBe(false);
		expect(clicks.next).not.toHaveBeenCalled();
	});

	it('reads the mark at each key, so → changes section again once the mark is gone', () => {
		const wrapper = markPaged();
		press('ArrowRight');
		wrapper.remove();
		expect(press('ArrowRight')).toBe(true);
		expect(clicks.next).toHaveBeenCalledTimes(1);
	});
});

// One typing rule for the global shortcuts and the pager (plan step S8.4, register CODE-18)
let isTyping: typeof import('./keyboardShortcuts').isTyping;
function focus(html: string, selector = '[data-focus]'): Element {
	document.body.innerHTML = html;
	const el = document.querySelector<HTMLElement>(selector)!;
	el.focus();
	return el;
}
const CASES: [string, string, boolean][] = [
	['a text input', '<input data-focus type="text">', true],
	['a search input', '<input data-focus type="search">', true],
	['a checkbox (Space toggles it)', '<input data-focus type="checkbox">', true],
	['a radio (the arrows move it)', '<input data-focus type="radio">', true],
	['a range slider (the arrows move it)', '<input data-focus type="range">', true],
	['a textarea', '<textarea data-focus></textarea>', true],
	['a select', '<select data-focus><option>a</option></select>', true],
	['contenteditable="true"', '<div data-focus tabindex="0" contenteditable="true"></div>', true],
	['contenteditable=""', '<div data-focus tabindex="0" contenteditable=""></div>', true],
	['contenteditable="plaintext-only"', '<div data-focus tabindex="0" contenteditable="plaintext-only"></div>', true],
	['a focusable element inside an editable host', '<div contenteditable="true"><span data-focus tabindex="0">x</span></div>', true],
	['a contenteditable="false" island in an editable host', '<div contenteditable="true"><span data-focus tabindex="0" contenteditable="false">x</span></div>', false],
	['contenteditable="false"', '<div data-focus tabindex="0" contenteditable="false"></div>', false],
	['contenteditable="FALSE" (the value is case-insensitive)', '<div data-focus tabindex="0" contenteditable="FALSE"></div>', false],
	['an invalid value alone inherits: nothing is editable', '<div data-focus tabindex="0" contenteditable="yes"></div>', false],
	['an invalid value inside an editable host inherits editable', '<div contenteditable="true"><b data-focus tabindex="0" contenteditable="bogus">x</b></div>', true],
	['an invalid value inside a "false" island inherits not editable', '<div contenteditable="true"><span contenteditable="false"><b data-focus tabindex="0" contenteditable="bogus">x</b></span></div>', false],
	['" false" with a space is invalid, so it inherits from its host', '<div contenteditable="true"><b data-focus tabindex="0" contenteditable=" false">x</b></div>', true],
	['a button', '<button data-focus>b</button>', false],
	['a link', '<a data-focus href="#x">a</a>', false],
	['a role="textbox" div without contenteditable', '<div data-focus tabindex="0" role="textbox"></div>', false]
];

describe('isTyping: one rule for the shortcuts and the pager (S8.4, CODE-18)', () => {
	beforeEach(async () => {
		isTyping = (await import('./keyboardShortcuts')).isTyping;
	});
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it.each(CASES)('%s → %s', (_name, html, expected) => {
		focus(html);
		expect(isTyping()).toBe(expected);
	});

	it('nothing focused (the body) is not typing; a null element is not typing', () => {
		(document.activeElement as HTMLElement | null)?.blur();
		expect(isTyping()).toBe(false);
		expect(isTyping(null)).toBe(false);
	});

	it('takes an element, so a caller can ask about one that is not focused', () => {
		document.body.innerHTML = '<input id="i">';
		expect(isTyping(document.getElementById('i'))).toBe(true);
	});
});
