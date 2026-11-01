/**
 * PredictThenRate (plan step S4.3, CODE-23, PED-25): one predict-first round, and the
 * one-time 'why' line.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import PredictThenRate from './PredictThenRate.svelte';

const WHY_SEEN_KEY = 'namsbokasafn:seen-why-predict';
const CARD = { front: 'Hvað er mól?', back: 'Magn efnis' };
const INTERVALS = { again: '<1 mín', hard: '1 dagur', good: '3 dagar', easy: '7 dagar' };

let component: ReturnType<typeof mount> | null = null;

function render(onrate: (...args: unknown[]) => void = () => {}) {
	const target = document.body.appendChild(document.createElement('div'));
	component = mount(PredictThenRate, { target, props: { ...CARD, intervals: INTERVALS, onrate } });
	flushSync();
	return target;
}

const button = (target: HTMLElement, name: string) =>
	[...target.querySelectorAll('button')].find((b) => b.textContent?.trim().startsWith(name) && (name !== 'Man það' || b.textContent.trim() === 'Man það')) as HTMLButtonElement;

beforeEach(() => {
	localStorage.clear();
});

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = '';
});

describe('PredictThenRate', () => {
	it('shows the question and no answer before a prediction', () => {
		const target = render();
		expect(target.textContent).toContain(CARD.front);
		expect(target.textContent).not.toContain(CARD.back);
		expect(target.querySelector('.rating-grid')).toBeNull();
	});

	it("after 'Man það' and then 'Rétt', reports ('good', true)", async () => {
		const onrate = vi.fn();
		const target = render(onrate);
		button(target, 'Man það').click();
		flushSync();
		await Promise.resolve();
		expect(target.textContent).toContain(CARD.back);
		button(target, 'Rétt').click();
		expect(onrate).toHaveBeenCalledWith('good', true);
	});

	it("after 'Man það ekki' and 'Rangt', reports ('again', false) at once: no message", () => {
		const onrate = vi.fn();
		const target = render(onrate);
		button(target, 'Man það ekki').click();
		flushSync();
		button(target, 'Rangt').click();
		expect(onrate).toHaveBeenCalledWith('again', false);
	});

	it('asks for correctness, not ease', () => {
		const target = render();
		button(target, 'Man það').click();
		flushSync();
		expect(target.querySelector('.ptr-hint')?.textContent).toBe('Berðu saman við svarið: hafðirðu rétt fyrir þér?');
	});
});

// Decision D04 (PED-20): after 'Man það' and a miss, a message before the next card
describe("PredictThenRate after 'Man það' and a miss", () => {
	it.each(['Rangt', 'Að hluta'] as const)("'%s' shows the message, with the answer, and records nothing yet", async (label) => {
		const onrate = vi.fn();
		const target = render(onrate);
		button(target, 'Man það').click();
		flushSync();
		button(target, label).click();
		flushSync();
		expect(target.querySelector('.ptr-miss')?.textContent).toBe('Þú hélst að þú myndir þetta — skoðaðu svarið vel.');
		expect(target.textContent).toContain(CARD.back);
		expect(onrate).not.toHaveBeenCalled();
	});

	it("'Áfram' then records the rating and the prediction", () => {
		const onrate = vi.fn();
		const target = render(onrate);
		button(target, 'Man það').click();
		flushSync();
		button(target, 'Rangt').click();
		flushSync();
		button(target, 'Áfram').click();
		expect(onrate).toHaveBeenCalledWith('again', true);
	});
});

describe("PredictThenRate's 'why' line", () => {
	it('shows on a fresh profile', () => {
		const target = render();
		expect(target.querySelector('.ptr-why')?.textContent).toContain('Af hverju?');
	});

	it('is remembered as seen once the first prediction is made', () => {
		const target = render();
		button(target, 'Man það').click();
		flushSync();
		expect(localStorage.getItem(WHY_SEEN_KEY)).toBe('1');
	});

	it('does not show again once seen', () => {
		localStorage.setItem(WHY_SEEN_KEY, '1');
		const target = render();
		expect(target.querySelector('.ptr-why')).toBeNull();
	});
});
