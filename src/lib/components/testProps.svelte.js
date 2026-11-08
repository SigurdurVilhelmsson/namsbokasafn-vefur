/**
 * Test-only: props a test can change after mount(). Svelte 5 passes a component its props by
 * reference, so a $state object here is a component's live props; runes compile only in
 * .svelte files and .svelte.js/.ts modules, not in a plain .test.ts. Plain JS because the
 * lint config parses .svelte.ts modules without TypeScript. No app code imports this.
 *
 * @param {Record<string, unknown>} initial
 * @returns {Record<string, unknown>}
 */
export function liveProps(initial) {
	const props = $state(initial);
	return props;
}
