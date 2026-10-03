/**
 * Tests for the PRINT glossary helpers.
 *
 * The PDF pipeline is a second consumer of the inline "(e. …)" gloss, and a
 * quieter one than the reader: `linkGlossaryTerms` scrapes English out of `<dfn>`
 * TEXT to resolve `#gloss-N` anchors. When efni retires that gloss (spec §4.7)
 * the anchors it resolved simply stop being emitted — no error, no failing build,
 * exit 0 — so the data-en fallback is pinned here.
 */

import { describe, it, expect } from 'vitest';
import {
	sortGlossaryTerms,
	normalizeTermKey,
	extractEnglishKey,
	extractDataEnKey,
	buildTermIndex,
	linkGlossaryTerms,
	type GlossaryTerm
} from './printGlossary';

const TERMS: GlossaryTerm[] = [
	{ term: 'formúlumassi', definition: 'Summa massa', english: 'formula mass' },
	{ term: 'þynning', definition: 'Að þynna lausn', english: 'Dilution' },
	{ term: 'mól', definition: 'Eining efnismagns', english: 'mole' }
];

const sorted = sortGlossaryTerms(TERMS);
const index = buildTermIndex(sorted);

/** The gloss index a term sorts to, so assertions do not hardcode ordering. */
function glossIndexOf(term: string): number {
	const i = sorted.findIndex((t) => t.term === term);
	expect(i).toBeGreaterThanOrEqual(0);
	return i;
}

describe('extractDataEnKey', () => {
	it('reads the attribute and lowercases it', () => {
		expect(extractDataEnKey(' id="term-00001" class="term" data-en="Formula Mass"')).toBe(
			'formula mass'
		);
	});

	it('returns empty when the attribute is absent', () => {
		expect(extractDataEnKey(' id="term-00001" class="term"')).toBe('');
	});

	it('decodes HTML entities in the value', () => {
		expect(extractDataEnKey(' data-en="Avogadro&#39;s number &amp; friends"')).toBe(
			"avogadro's number & friends"
		);
	});

	it('is not confused by another attribute ending in -en', () => {
		expect(extractDataEnKey(' data-broken="x" lang="en"')).toBe('');
	});
});

describe('buildTermIndex', () => {
	it('lowercases English keys, so a case-preserving data-en can match', () => {
		expect(index.byEnglish.get('dilution')).toBe(glossIndexOf('þynning'));
	});

	// An empty key would be returned by every lookup miss — both extractEnglishKey
	// and extractDataEnKey return '' when absent — and would link every unmatched
	// dfn to whichever entry happened to hold it.
	it('never stores an empty English key', () => {
		const withBlank = buildTermIndex(
			sortGlossaryTerms([{ term: 'gas', definition: 'Efnishamur', english: '   ' }])
		);
		expect(withBlank.byEnglish.has('')).toBe(false);
		expect(withBlank.byEnglish.get('')).toBeUndefined();
	});
});

describe('linkGlossaryTerms', () => {
	it('resolves via the Icelandic headword', () => {
		const out = linkGlossaryTerms('<p><dfn class="term">mól</dfn></p>', index);
		expect(out).toContain(`href="#gloss-${glossIndexOf('mól')}"`);
	});

	it('resolves via an inline "(e. …)" gloss when the Icelandic differs', () => {
		const out = linkGlossaryTerms(
			'<p><dfn class="term">formúlumassa (e. formula mass)</dfn></p>',
			index
		);
		expect(out).toContain(`href="#gloss-${glossIndexOf('formúlumassi')}"`);
	});

	// The case this file exists for: no inline gloss, English only in data-en.
	// Fails before the fallback was added.
	it('resolves via data-en when the inline gloss is gone', () => {
		const out = linkGlossaryTerms(
			'<p><dfn id="term-00001" class="term" data-en="formula mass">formúlumassa</dfn></p>',
			index
		);
		expect(out).toContain(`href="#gloss-${glossIndexOf('formúlumassi')}"`);
	});

	it('matches a case-preserving data-en against the lowercased index', () => {
		const out = linkGlossaryTerms(
			'<p><dfn class="term" data-en="Dilution">útþynning</dfn></p>',
			index
		);
		expect(out).toContain(`href="#gloss-${glossIndexOf('þynning')}"`);
	});

	// Control: without either English source there is nothing to resolve, so the
	// dfn must be left alone. Proves the assertions above are not matching on
	// something every input would satisfy.
	it('leaves a dfn alone when neither the Icelandic nor any English matches', () => {
		const html = '<p><dfn class="term">alkýlhalíð</dfn></p>';
		const out = linkGlossaryTerms(html, index);
		expect(out).toBe(html);
		expect(out).not.toContain('glossary-link');
	});

	it('prefers the Icelandic headword over data-en when both resolve', () => {
		const out = linkGlossaryTerms(
			'<p><dfn class="term" data-en="mole">þynning</dfn></p>',
			index
		);
		expect(out).toContain(`href="#gloss-${glossIndexOf('þynning')}"`);
		expect(out).not.toContain(`href="#gloss-${glossIndexOf('mól')}"`);
	});

	it('links only the first occurrence of a term per section', () => {
		const out = linkGlossaryTerms(
			'<p><dfn class="term" data-en="mole">mól</dfn> og <dfn class="term" data-en="mole">mól</dfn></p>',
			index
		);
		expect(out.match(/class="glossary-link"/g)).toHaveLength(1);
	});

	it('emits a hidden anchor target for each linked term', () => {
		const n = glossIndexOf('mól');
		const out = linkGlossaryTerms('<p><dfn class="term" data-en="mole">mól</dfn></p>', index);
		expect(out).toContain(`<span id="gloss-${n}"></span>`);
	});
});

describe('normalizeTermKey / extractEnglishKey', () => {
	it('splits an inline gloss into its two halves', () => {
		const text = 'formúlumassa (e. formula mass)';
		expect(normalizeTermKey(text)).toBe('formúlumassa');
		expect(extractEnglishKey(text)).toBe('formula mass');
	});

	it('tolerates nested parens in the English half', () => {
		expect(extractEnglishKey('myndunarfasti (e. formation constant (Kf))')).toBe(
			'formation constant (kf)'
		);
	});

	it('returns the text unchanged and no English when there is no gloss', () => {
		expect(normalizeTermKey('mól')).toBe('mól');
		expect(extractEnglishKey('mól')).toBe('');
	});
});
