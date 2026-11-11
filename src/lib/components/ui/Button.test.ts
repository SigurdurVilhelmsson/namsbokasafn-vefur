/**
 * Button (plan step SF.2, UI-17): the one primary / secondary / ghost button, an <a> when
 * given an href, passing every other attribute through.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRawSnippet, flushSync, mount, unmount } from 'svelte';
import Button from './Button.svelte';

let component: ReturnType<typeof mount> | null = null;
afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = '';
});

const label = (text: string) => createRawSnippet(() => ({ render: () => `<span>${text}</span>` }));

function render(props: Record<string, unknown>): HTMLElement {
	const target = document.body.appendChild(document.createElement('div'));
	component = mount(Button, { target, props: { children: label('Næsta'), ...props } });
	flushSync();
	return target.firstElementChild as HTMLElement;
}

describe('Button', () => {
	it('is a <button type="button"> by default, so it never submits a form', () => {
		const el = render({});
		expect(el.tagName).toBe('BUTTON');
		expect(el.getAttribute('type')).toBe('button');
	});

	it('renders its children', () => {
		expect(render({}).textContent).toBe('Næsta');
	});

	it('is a secondary button unless told otherwise', () => {
		expect(render({}).classList.contains('nb-btn-secondary')).toBe(true);
	});

	it.each(['primary', 'secondary', 'ghost'])('takes the %s variant', (variant) => {
		expect(render({ variant }).classList.contains(`nb-btn-${variant}`)).toBe(true);
	});

	it('takes the lg size', () => {
		expect(render({ size: 'lg' }).classList.contains('nb-btn-lg')).toBe(true);
	});

	it('is a link when given an href', () => {
		const el = render({ href: '/efnafraedi-2e/' });
		expect(el.tagName).toBe('A');
		expect(el.getAttribute('href')).toBe('/efnafraedi-2e/');
		expect(el.hasAttribute('type')).toBe(false);
	});

	it('passes other attributes through: a name, disabled, data-*, a class of its own', () => {
		const el = render({ 'aria-label': 'Næsta síða', disabled: true, 'data-x': '1', class: 'extra' });
		expect(el.getAttribute('aria-label')).toBe('Næsta síða');
		expect((el as HTMLButtonElement).disabled).toBe(true);
		expect(el.getAttribute('data-x')).toBe('1');
		expect(el.classList.contains('extra')).toBe(true);
	});

	it('calls its onclick', () => {
		const onclick = vi.fn();
		render({ onclick }).click();
		expect(onclick).toHaveBeenCalledOnce();
	});
});
