/**
 * Tests for bionic reading — in-place unwrap (audit finding 1.3)
 *
 * Toggle-off must not orphan listeners that other content actions attached
 * to the same DOM: previously the action restored an innerHTML snapshot,
 * which left practice-problem/answer buttons rendered but dead.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

let bionicReadingAction: typeof import('./bionicReading').bionicReadingAction;
let settings: typeof import('$lib/stores/settings').settings;

describe('bionicReading action', () => {
	beforeEach(async () => {
		localStorage.clear();
		vi.resetModules();
		settings = (await import('$lib/stores/settings')).settings;
		bionicReadingAction = (await import('./bionicReading')).bionicReadingAction;
	});

	function makeContainer(): HTMLElement {
		const el = document.createElement('div');
		el.innerHTML =
			'<p>Rafeindir sveima um kjarnann í rafeindaskýi atómsins.</p>' +
			'<div class="practice-problem-container"><button class="show-answer-btn">Sýna svar</button></div>';
		document.body.appendChild(el);
		return el;
	}

	it('bolds word prefixes when enabled and unwraps them cleanly when disabled', () => {
		settings.setBionicReading(true);
		const el = makeContainer();
		const original = el.textContent;

		const action = bionicReadingAction(el);
		expect(el.querySelectorAll('b.bionic-bold').length).toBeGreaterThan(0);
		expect(el.textContent).toBe(original);

		settings.setBionicReading(false);
		expect(el.querySelectorAll('b.bionic-bold').length).toBe(0);
		expect(el.textContent).toBe(original);
		expect(el.hasAttribute('data-bionic-processed')).toBe(false);

		action.destroy?.();
		el.remove();
	});

	it('keeps event listeners attached through an enable/disable cycle (audit 1.3)', () => {
		const el = makeContainer();
		const button = el.querySelector('button')!;
		const onClick = vi.fn();
		// An enhancer (practiceProblems) attached this before bionic ran
		button.addEventListener('click', onClick);

		settings.setBionicReading(true);
		const action = bionicReadingAction(el);
		settings.setBionicReading(false);

		// The button must be the SAME element with its listener intact —
		// an innerHTML restore would have replaced it with a dead clone
		expect(el.querySelector('button')).toBe(button);
		el.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(onClick).toHaveBeenCalledTimes(1);

		action.destroy?.();
		el.remove();
	});

	it('preserves elements nested inside a bolded word (e.g. highlights)', () => {
		settings.setBionicReading(true);
		const el = makeContainer();
		const action = bionicReadingAction(el);

		// Simulate a highlight wrapped inside a bionic <b> after bolding
		const b = el.querySelector('b.bionic-bold')!;
		const mark = document.createElement('mark');
		mark.textContent = b.textContent;
		b.textContent = '';
		b.appendChild(mark);

		settings.setBionicReading(false);
		expect(el.querySelector('mark')?.textContent).toBe(mark.textContent);

		action.destroy?.();
		el.remove();
	});

	it('destroy() while enabled unwraps the container', () => {
		settings.setBionicReading(true);
		const el = makeContainer();
		const action = bionicReadingAction(el);
		expect(el.querySelectorAll('b.bionic-bold').length).toBeGreaterThan(0);

		action.destroy?.();
		expect(el.querySelectorAll('b.bionic-bold').length).toBe(0);
		el.remove();
	});
});
