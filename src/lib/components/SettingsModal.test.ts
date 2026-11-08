/**
 * Settings' Línubil and Línubreidd on SegmentedControl's radios (plan step S11.3, register
 * UI-03). The expected option comes from the settings defaults, never from a literal: what a new
 * reader sees is the default, whatever it is.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { get } from 'svelte/store';
import SettingsModal from './SettingsModal.svelte';
import { defaultSettings, settings } from '$lib/stores/settings';

let modal: ReturnType<typeof mount> | null = null;
afterEach(() => {
	if (modal) unmount(modal);
	modal = null;
	document.body.innerHTML = '';
	settings.reset?.();
});

function open() {
	const target = document.body.appendChild(document.createElement('div'));
	modal = mount(SettingsModal, { target, props: { isOpen: true, onClose: () => {} } });
	flushSync();
	return target;
}
const group = (root: ParentNode, legend: string) =>
	Array.from(root.querySelectorAll('fieldset')).find((f) => f.querySelector('legend')?.textContent?.trim() === legend);
const checked = (fieldset: Element | undefined) =>
	Array.from(fieldset?.querySelectorAll<HTMLInputElement>('input[type="radio"]') ?? []).filter((r) => r.checked).map((r) => r.value);

describe('Settings: Línubil and Línubreidd are radio groups (S11.3)', () => {
	for (const [legend, key] of [
		['Línubil', 'lineHeight'],
		['Línubreidd', 'lineWidth']
	] as const) {
		it(`${legend} is a fieldset whose checked radio is the setting in effect (the default here)`, () => {
			const root = open();
			expect(checked(group(root, legend))).toEqual([get(settings)[key]]);
			expect(get(settings)[key]).toBe(defaultSettings[key]);
		});

		it(`${legend}: choosing another radio sets it`, () => {
			const root = open();
			const other = Array.from(group(root, legend)!.querySelectorAll<HTMLInputElement>('input[type="radio"]')).find(
				(r) => r.value !== defaultSettings[key]
			)!;
			other.checked = true;
			other.dispatchEvent(new Event('change', { bubbles: true }));
			flushSync();
			expect(get(settings)[key]).toBe(other.value);
			expect(checked(group(root, legend))).toEqual([other.value]);
		});
	}
});
