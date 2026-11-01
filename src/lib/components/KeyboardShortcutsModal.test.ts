/**
 * KeyboardShortcutsModal: rebinding a shortcut (code review M10, June 2026).
 *
 * Escape while editing was saved as the new binding, and the save, delayed 300 ms to show the
 * key, applied to whichever shortcut was being edited when it fired, so a key pressed for one
 * shortcut could land on the next one opened.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import KeyboardShortcutsModal from './KeyboardShortcutsModal.svelte';
import { settings } from '$lib/stores/settings';

let component: ReturnType<typeof mount> | null = null;

function render() {
	const target = document.body.appendChild(document.createElement('div'));
	component = mount(KeyboardShortcutsModal, { target, props: { isOpen: true, onClose: () => {} } });
	flushSync();
}

/** The key button in the row whose description is `description` */
function keyButton(description: string): HTMLButtonElement {
	const label = [...document.querySelectorAll('span')].find((s) => s.textContent?.trim() === description);
	const buttons = label?.parentElement?.querySelectorAll('button');
	if (!buttons?.length) throw new Error(`No row for "${description}"`);
	return buttons[buttons.length - 1] as HTMLButtonElement;
}

function press(key: string) {
	window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
	flushSync();
}

const THEME = 'Skipta um þema';
const SIDEBAR = 'Opna/loka hliðarslá';

describe('KeyboardShortcutsModal, rebinding (M10)', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		settings.resetAllShortcuts();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.replaceChildren();
		vi.useRealTimers();
	});

	it('Escape while editing cancels the edit and keeps the binding', () => {
		render();
		keyButton(THEME).click();
		flushSync();
		press('Escape');
		vi.advanceTimersByTime(500);
		flushSync();
		expect(settings.getShortcut('toggleTheme')).toBe('t');
		expect(keyButton(THEME).title).toBe('Smelltu til að breyta');
	});

	it('a key pressed for one shortcut is saved to it, even if another edit starts within 300 ms', () => {
		render();
		keyButton(THEME).click();
		flushSync();
		press('x');
		keyButton(SIDEBAR).click();
		flushSync();
		vi.advanceTimersByTime(500);
		flushSync();
		expect(settings.getShortcut('toggleTheme')).toBe('x');
		expect(settings.getShortcut('toggleSidebar')).toBe('s');
	});
});
