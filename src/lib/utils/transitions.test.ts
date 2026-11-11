/**
 * Svelte's transitions, quiet under prefers-reduced-motion (plan step SF.3, register UI-25).
 * Svelte skips element.animate() only when duration AND delay are both 0, so the wrappers
 * zero both; with motion allowed they pass the caller's parameters through untouched.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fade, fly, scale, slide, scrollBehavior } from './transitions';

const motion = { current: false };

const node = () => document.body.appendChild(document.createElement('div'));

describe('transitions', () => {
	beforeEach(() => {
		motion.current = false;
		vi.stubGlobal('matchMedia', (query: string) => ({
			matches: query === '(prefers-reduced-motion: reduce)' && motion.current,
			media: query
		}));
	});
	afterEach(() => vi.unstubAllGlobals());

	it.each([
		['fade', fade],
		['fly', fly],
		['scale', scale],
		['slide', slide]
	] as const)('%s keeps its duration and delay while motion is allowed', (_, transition) => {
		const config = transition(node(), { duration: 200, delay: 50 });
		expect([config.duration, config.delay]).toEqual([200, 50]);
	});

	it.each([
		['fade', fade],
		['fly', fly],
		['scale', scale],
		['slide', slide]
	] as const)('%s has no duration and no delay under reduced motion', (_, transition) => {
		motion.current = true;
		const config = transition(node(), { duration: 200, delay: 50 });
		expect([config.duration, config.delay]).toEqual([0, 0]);
	});

	it('zeroes a transition called with no parameters too', () => {
		motion.current = true;
		const config = fade(node());
		expect([config.duration, config.delay]).toEqual([0, 0]);
	});

	it("scrolls smoothly while motion is allowed, and jumps ('auto') under reduced motion", () => {
		expect(scrollBehavior()).toBe('smooth');
		motion.current = true;
		expect(scrollBehavior()).toBe('auto');
	});
});
