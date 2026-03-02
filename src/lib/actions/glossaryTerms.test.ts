/**
 * Tests for glossaryTerms Svelte action
 *
 * Covers three-tier term matching, toggle reactivity, and cleanup.
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { writable } from 'svelte/store';
import type { GlossaryTerm } from '$lib/types/content';

// --- Mocks ---

// Mock glossaryHighlighting as a writable so tests can toggle it
const mockGlossaryHighlighting = writable(true);

vi.mock('$lib/stores/settings', () => ({
	settings: writable({
		glossaryHighlighting: true
	}),
	glossaryHighlighting: mockGlossaryHighlighting
}));

// Mock glossary terms for testing
const mockTerms: GlossaryTerm[] = [
	{ term: 'tilgáta', definition: 'Ágiskun sem hægt er að prófa', english: 'hypothesis', chapter: 1 },
	{ term: 'efni', definition: 'Allt sem hefur massa og tekur pláss', english: 'matter', chapter: 1 },
	{ term: 'sameind', definition: 'Tveir eða fleiri atóm tengd saman', english: 'molecule', chapter: 1 },
	{ term: 'lögmál', definition: 'Almenn regla sem lýsir fyrirbæri', english: 'laws', chapter: 1 },
	{ term: 'gas', definition: 'Efnishamur sem fyllir ílát sitt', chapter: 1 },
	{
		term: 'vísindaleg aðferð',
		definition: 'Kerfisbundin nálgun',
		english: 'scientific method',
		chapter: 1,
		relatedTerms: ['tilgáta', 'lögmál']
	}
];

// Track mock load calls
let mockLoadFn: Mock;

vi.mock('$lib/stores/glossary', async () => {
	const { writable: w } = await import('svelte/store');

	const store = w({
		bookSlug: null as string | null,
		terms: [] as GlossaryTerm[],
		loading: false,
		error: null
	});

	mockLoadFn = vi.fn(async (bookSlug: string) => {
		store.set({
			bookSlug,
			terms: mockTerms,
			loading: false,
			error: null
		});
	});

	return {
		glossaryStore: {
			...store,
			load: mockLoadFn,
			clear: () =>
				store.set({
					bookSlug: null,
					terms: [],
					loading: false,
					error: null
				})
		}
	};
});

vi.mock('$lib/utils/html', () => ({
	escapeHtml: (s: string) => s
}));

// --- Helpers ---

/** Create a container with dfn.term elements */
function createContentNode(dfnSpecs: Array<{ text: string; dataTerm?: string }>): HTMLDivElement {
	const container = document.createElement('div');
	for (const spec of dfnSpecs) {
		const dfn = document.createElement('dfn');
		dfn.className = 'term';
		dfn.textContent = spec.text;
		if (spec.dataTerm) {
			dfn.setAttribute('data-term', spec.dataTerm);
		}
		container.appendChild(document.createElement('p')).appendChild(dfn);
	}
	return container;
}

/** Get all dfn elements from container */
function getDfnElements(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll('dfn.term'));
}

/** Wait for async init to complete */
async function flush(): Promise<void> {
	await new Promise((r) => setTimeout(r, 0));
}

// --- Tests ---

describe('glossaryTerms action', () => {
	let glossaryTerms: typeof import('./glossaryTerms').glossaryTerms;

	beforeEach(async () => {
		vi.resetModules();

		// Re-import to get fresh module with mocks applied
		// But we need to re-setup the mocks since resetModules clears them
		// Actually, vi.mock is hoisted, so we just need to re-import
		const module = await import('./glossaryTerms');
		glossaryTerms = module.glossaryTerms;

		// Reset to enabled
		mockGlossaryHighlighting.set(true);
		mockLoadFn?.mockClear();
	});

	describe('three-tier term matching', () => {
		it('should match via data-term attribute (tier 1)', async () => {
			const node = createContentNode([
				{ text: 'tilgátuna', dataTerm: 'tilgáta' } // inflected form, but data-term has base
			]);

			const action = glossaryTerms(node, { bookSlug: 'efnafraedi-2e' });
			await flush();

			const dfn = getDfnElements(node)[0];
			expect(dfn.classList.contains('glossary-term')).toBe(true);
			expect(dfn.dataset.glossaryMatch).toBe('tilgáta');

			action.destroy();
		});

		it('should match via Icelandic text (tier 2) when no data-term', async () => {
			const node = createContentNode([
				{ text: 'gas' } // exact match, no English suffix, no data-term
			]);

			const action = glossaryTerms(node, { bookSlug: 'efnafraedi-2e' });
			await flush();

			const dfn = getDfnElements(node)[0];
			expect(dfn.classList.contains('glossary-term')).toBe(true);
			expect(dfn.dataset.glossaryMatch).toBe('gas');

			action.destroy();
		});

		it('should match via Icelandic text after stripping English suffix (tier 2)', async () => {
			const node = createContentNode([
				{ text: 'efni (e. matter)' } // Icelandic "efni" matches exactly
			]);

			const action = glossaryTerms(node, { bookSlug: 'efnafraedi-2e' });
			await flush();

			const dfn = getDfnElements(node)[0];
			expect(dfn.classList.contains('glossary-term')).toBe(true);
			expect(dfn.dataset.glossaryMatch).toBe('efni');

			action.destroy();
		});

		it('should match via English fallback (tier 3) when Icelandic is inflected', async () => {
			const node = createContentNode([
				{ text: 'tilgátu (e. hypothesis)' } // "tilgátu" is inflected, won't match "tilgáta"
			]);

			const action = glossaryTerms(node, { bookSlug: 'efnafraedi-2e' });
			await flush();

			const dfn = getDfnElements(node)[0];
			expect(dfn.classList.contains('glossary-term')).toBe(true);
			expect(dfn.dataset.glossaryMatch).toBe('tilgáta');

			action.destroy();
		});

		it('should prefer data-term (tier 1) over text matching', async () => {
			// data-term points to "sameind", but text says "efni (e. matter)"
			const node = createContentNode([
				{ text: 'efni (e. matter)', dataTerm: 'sameind' }
			]);

			const action = glossaryTerms(node, { bookSlug: 'efnafraedi-2e' });
			await flush();

			const dfn = getDfnElements(node)[0];
			expect(dfn.dataset.glossaryMatch).toBe('sameind');

			action.destroy();
		});

		it('should fall through to tier 2 if data-term does not match glossary', async () => {
			const node = createContentNode([
				{ text: 'efni (e. matter)', dataTerm: 'nonexistent-term' }
			]);

			const action = glossaryTerms(node, { bookSlug: 'efnafraedi-2e' });
			await flush();

			const dfn = getDfnElements(node)[0];
			// Falls through tier 1 (nonexistent), matches tier 2 (Icelandic "efni")
			expect(dfn.classList.contains('glossary-term')).toBe(true);
			expect(dfn.dataset.glossaryMatch).toBe('efni');

			action.destroy();
		});

		it('should skip terms that match no tier', async () => {
			const node = createContentNode([
				{ text: 'Dalton' } // a name, not in our mock glossary
			]);

			const action = glossaryTerms(node, { bookSlug: 'efnafraedi-2e' });
			await flush();

			const dfn = getDfnElements(node)[0];
			expect(dfn.classList.contains('glossary-term')).toBe(false);

			action.destroy();
		});

		it('should process multiple dfn elements independently', async () => {
			const node = createContentNode([
				{ text: 'gas' },
				{ text: 'tilgátu (e. hypothesis)' }, // English fallback
				{ text: 'Dalton' }, // no match
				{ text: 'efni (e. matter)', dataTerm: 'efni' } // data-term
			]);

			const action = glossaryTerms(node, { bookSlug: 'efnafraedi-2e' });
			await flush();

			const dfns = getDfnElements(node);
			expect(dfns[0].classList.contains('glossary-term')).toBe(true); // gas
			expect(dfns[1].classList.contains('glossary-term')).toBe(true); // tilgáta via English
			expect(dfns[2].classList.contains('glossary-term')).toBe(false); // Dalton
			expect(dfns[3].classList.contains('glossary-term')).toBe(true); // efni via data-term

			action.destroy();
		});

		it('should handle case-insensitive matching', async () => {
			const node = createContentNode([
				{ text: 'Lögmál (e. laws)' } // uppercase L should match "lögmál"
			]);

			const action = glossaryTerms(node, { bookSlug: 'efnafraedi-2e' });
			await flush();

			const dfn = getDfnElements(node)[0];
			expect(dfn.classList.contains('glossary-term')).toBe(true);
			expect(dfn.dataset.glossaryMatch).toBe('lögmál');

			action.destroy();
		});
	});

	describe('accessibility attributes', () => {
		it('should set role, tabindex, and aria-label on matched terms', async () => {
			const node = createContentNode([{ text: 'efni (e. matter)' }]);

			const action = glossaryTerms(node, { bookSlug: 'efnafraedi-2e' });
			await flush();

			const dfn = getDfnElements(node)[0];
			expect(dfn.getAttribute('role')).toBe('button');
			expect(dfn.getAttribute('tabindex')).toBe('0');
			expect(dfn.getAttribute('aria-label')).toBe('Skilgreining: efni (matter)');

			action.destroy();
		});

		it('should omit English from aria-label when term has no english field', async () => {
			const node = createContentNode([{ text: 'gas' }]);

			const action = glossaryTerms(node, { bookSlug: 'efnafraedi-2e' });
			await flush();

			const dfn = getDfnElements(node)[0];
			expect(dfn.getAttribute('aria-label')).toBe('Skilgreining: gas');

			action.destroy();
		});
	});

	describe('toggle reactivity', () => {
		it('should not process terms when glossaryHighlighting is off at init', async () => {
			mockGlossaryHighlighting.set(false);

			const node = createContentNode([{ text: 'efni (e. matter)' }]);
			const action = glossaryTerms(node, { bookSlug: 'efnafraedi-2e' });
			await flush();

			const dfn = getDfnElements(node)[0];
			expect(dfn.classList.contains('glossary-term')).toBe(false);

			action.destroy();
		});

		it('should process terms when toggled on after being off', async () => {
			mockGlossaryHighlighting.set(false);

			const node = createContentNode([{ text: 'efni (e. matter)' }]);
			const action = glossaryTerms(node, { bookSlug: 'efnafraedi-2e' });
			await flush();

			// Should not be processed yet
			const dfn = getDfnElements(node)[0];
			expect(dfn.classList.contains('glossary-term')).toBe(false);

			// Toggle on
			mockGlossaryHighlighting.set(true);
			await flush();

			expect(dfn.classList.contains('glossary-term')).toBe(true);

			action.destroy();
		});

		it('should remove styling when toggled off', async () => {
			const node = createContentNode([{ text: 'efni (e. matter)' }]);
			const action = glossaryTerms(node, { bookSlug: 'efnafraedi-2e' });
			await flush();

			const dfn = getDfnElements(node)[0];
			expect(dfn.classList.contains('glossary-term')).toBe(true);

			// Toggle off
			mockGlossaryHighlighting.set(false);

			expect(dfn.classList.contains('glossary-term')).toBe(false);
			expect(dfn.getAttribute('role')).toBeNull();
			expect(dfn.getAttribute('tabindex')).toBeNull();
			expect(dfn.getAttribute('aria-label')).toBeNull();

			action.destroy();
		});

		it('should re-apply when toggled off then on', async () => {
			const node = createContentNode([
				{ text: 'gas' },
				{ text: 'tilgátu (e. hypothesis)' }
			]);
			const action = glossaryTerms(node, { bookSlug: 'efnafraedi-2e' });
			await flush();

			const dfns = getDfnElements(node);
			expect(dfns[0].classList.contains('glossary-term')).toBe(true);
			expect(dfns[1].classList.contains('glossary-term')).toBe(true);

			// Toggle off
			mockGlossaryHighlighting.set(false);
			expect(dfns[0].classList.contains('glossary-term')).toBe(false);
			expect(dfns[1].classList.contains('glossary-term')).toBe(false);

			// Toggle on
			mockGlossaryHighlighting.set(true);
			await flush();
			expect(dfns[0].classList.contains('glossary-term')).toBe(true);
			expect(dfns[1].classList.contains('glossary-term')).toBe(true);

			action.destroy();
		});
	});

	describe('cleanup on destroy', () => {
		it('should remove glossary-term class on destroy', async () => {
			const node = createContentNode([{ text: 'efni (e. matter)' }]);
			const action = glossaryTerms(node, { bookSlug: 'efnafraedi-2e' });
			await flush();

			const dfn = getDfnElements(node)[0];
			expect(dfn.classList.contains('glossary-term')).toBe(true);

			action.destroy();

			expect(dfn.classList.contains('glossary-term')).toBe(false);
			expect(dfn.getAttribute('role')).toBeNull();
			expect(dfn.getAttribute('tabindex')).toBeNull();
			expect(dfn.getAttribute('aria-label')).toBeNull();
		});

		it('should load glossary for the specified book', async () => {
			const node = createContentNode([{ text: 'gas' }]);
			const action = glossaryTerms(node, { bookSlug: 'efnafraedi-2e' });
			await flush();

			expect(mockLoadFn).toHaveBeenCalledWith('efnafraedi-2e');

			action.destroy();
		});
	});

	describe('event listeners', () => {
		it('should attach click handler to matched terms', async () => {
			const node = createContentNode([{ text: 'efni (e. matter)' }]);
			const action = glossaryTerms(node, { bookSlug: 'efnafraedi-2e' });
			await flush();

			const dfn = getDfnElements(node)[0];

			// Create and dispatch a click event
			const clickEvent = new MouseEvent('click', { bubbles: true });
			const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');
			const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation');
			dfn.dispatchEvent(clickEvent);

			expect(preventDefaultSpy).toHaveBeenCalled();
			expect(stopPropagationSpy).toHaveBeenCalled();

			action.destroy();
		});

		it('should remove event listeners on destroy', async () => {
			const node = createContentNode([{ text: 'efni (e. matter)' }]);
			const action = glossaryTerms(node, { bookSlug: 'efnafraedi-2e' });
			await flush();

			const dfn = getDfnElements(node)[0];
			const removeEventListenerSpy = vi.spyOn(dfn, 'removeEventListener');

			action.destroy();

			// Should remove: mouseenter, mouseleave, focus, blur, click = 5 listeners
			expect(removeEventListenerSpy).toHaveBeenCalledTimes(5);
		});
	});
});
