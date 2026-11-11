/**
 * Svelte's transitions, quiet under prefers-reduced-motion (plan step SF.3, register UI-25).
 *
 * Import transitions from here, never from 'svelte/transition' (an ESLint rule enforces it).
 * Svelte runs them on the Web Animations API, which no CSS can stop, and it skips
 * element.animate() only when duration AND delay are both 0, so under reduced motion these
 * wrappers zero both. With motion allowed they pass the caller's parameters through.
 * CSS animations and transitions are app.css's reduced-motion reset's job.
 *
 * The setting is read when a transition starts, from matchMedia, rather than through
 * svelte/motion's prefersReducedMotion, which calls matchMedia as soon as it is imported
 * (jsdom has none, so every component test that imported it threw).
 */
import {
	fade as svelteFade,
	fly as svelteFly,
	scale as svelteScale,
	slide as svelteSlide,
	type TransitionConfig
} from 'svelte/transition';

type Transition<P> = (node: Element, params?: P) => TransitionConfig;

/** The reader asks for reduced motion (false on the server, or with no matchMedia). */
function reducedMotion(): boolean {
	return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
		? window.matchMedia('(prefers-reduced-motion: reduce)').matches
		: false;
}

function quiet<P extends { duration?: number; delay?: number }>(transition: Transition<P>): Transition<P> {
	return (node, params) =>
		transition(node, reducedMotion() ? ({ ...params, duration: 0, delay: 0 } as P) : params);
}

export const fade = quiet(svelteFade);
export const fly = quiet(svelteFly);
export const scale = quiet(svelteScale);
export const slide = quiet(svelteSlide);

/** For scrollIntoView and scrollTo: a script's 'smooth' ignores CSS, so ask here. */
export function scrollBehavior(): ScrollBehavior {
	return reducedMotion() ? 'auto' : 'smooth';
}
