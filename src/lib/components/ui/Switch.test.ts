/**
 * Switch (plan step SF.2, UI-17): a button with role="switch" whose aria-checked follows
 * `checked`; the caller owns the state and is told on a press.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import Switch from './Switch.svelte';

let component: ReturnType<typeof mount> | null = null;
afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = '';
});

function render(props: Record<string, unknown>): HTMLButtonElement {
	const target = document.body.appendChild(document.createElement('div'));
	component = mount(Switch, { target, props: { checked: false, onchange: () => {}, ...props } });
	flushSync();
	return target.querySelector('button')!;
}

describe('Switch', () => {
	it('is a button with role="switch" that never submits a form', () => {
		const el = render({});
		expect(el.getAttribute('role')).toBe('switch');
		expect(el.getAttribute('type')).toBe('button');
	});

	it.each([
		[false, 'false'],
		[true, 'true']
	])('checked=%s is aria-checked="%s"', (checked, expected) => {
		expect(render({ checked }).getAttribute('aria-checked')).toBe(expected);
	});

	it('tells its caller on a press, and leaves the state to the caller', () => {
		const onchange = vi.fn();
		const el = render({ onchange });
		el.click();
		flushSync();
		expect(onchange).toHaveBeenCalledOnce();
		expect(el.getAttribute('aria-checked')).toBe('false');
	});

	it('passes the id and the labelling attributes through', () => {
		const el = render({ id: 'x-toggle', 'aria-labelledby': 'x-label', 'aria-describedby': 'x-help' });
		expect(el.id).toBe('x-toggle');
		expect(el.getAttribute('aria-labelledby')).toBe('x-label');
		expect(el.getAttribute('aria-describedby')).toBe('x-help');
	});
});
