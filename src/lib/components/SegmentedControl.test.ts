/**
 * SegmentedControl (plan step S11.3, register UI-03): one choice among a few on native radios,
 * named by a fieldset, with a check on the chosen option as well as the fill.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import SegmentedControl from './SegmentedControl.svelte';
import { liveProps } from './testProps.svelte.js';

const OPTIONS = [
	{ value: 'a', label: 'Eitt' },
	{ value: 'b', label: 'Tvö' },
	{ value: 'c', label: 'Þrjú' }
] as const;

let mounted: ReturnType<typeof mount>[] = [];
afterEach(() => {
	for (const m of mounted) unmount(m);
	mounted = [];
	document.body.innerHTML = '';
});

function open(extra: Record<string, unknown> = {}) {
	const target = document.body.appendChild(document.createElement('div'));
	const onchange = vi.fn();
	const props = liveProps({ legend: 'Hópur', name: 'test-group', options: OPTIONS, value: 'b', onchange, ...extra });
	const control = mount(SegmentedControl, { target, props: props as never });
	mounted.push(control);
	flushSync();
	return { target, props, onchange, control };
}
const radios = (root: ParentNode) => Array.from(root.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
const checkedLabel = (root: ParentNode) => radios(root).find((r) => r.checked)?.closest('label')?.textContent?.trim();

describe('SegmentedControl', () => {
	it('is a fieldset named by its legend, with one radio per option in one group', () => {
		const { target } = open();
		expect(target.querySelector('fieldset > legend')?.textContent).toBe('Hópur');
		expect(radios(target).map((r) => r.value)).toEqual(['a', 'b', 'c']);
		expect(new Set(radios(target).map((r) => r.name))).toEqual(new Set(['test-group']));
	});

	it('checks the option whose value it holds, and follows a new value', () => {
		const { target, props } = open();
		expect(checkedLabel(target)).toBe('Tvö');
		props.value = 'c';
		flushSync();
		expect(checkedLabel(target)).toBe('Þrjú');
	});

	it('marks the chosen option with a check, not only a colour', () => {
		const { target } = open();
		const withCheck = Array.from(target.querySelectorAll('label')).filter((l) => l.querySelector('svg'));
		expect(withCheck.map((l) => l.textContent?.trim())).toEqual(['Tvö']);
	});

	it('reports a choice', () => {
		const { target, onchange } = open();
		const radio = radios(target)[0];
		radio.checked = true;
		radio.dispatchEvent(new Event('change', { bubbles: true }));
		expect(onchange).toHaveBeenCalledWith('a');
	});

	it('names each radio by its label text', () => {
		const { target } = open();
		for (const radio of radios(target)) {
			expect(radio.closest('label')?.textContent?.trim()).toBe(OPTIONS.find((o) => o.value === radio.value)!.label);
		}
	});

	it('can hide its legend for screen readers only', () => {
		const { target } = open({ legendHidden: true });
		expect(target.querySelector('legend')?.classList.contains('sr-only')).toBe(true);
	});

	it('focuses an option on request', () => {
		const { target, control } = open();
		(control as unknown as { focus: (v: string) => void }).focus('c');
		expect(document.activeElement).toBe(radios(target)[2]);
	});
});
