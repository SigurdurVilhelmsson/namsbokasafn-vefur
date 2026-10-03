import { describe, it, expect } from 'vitest';
import { getBook } from '$lib/types/book';
import { compactCreditPair, creditLine, MACHINE_TRANSLATION_CREDIT } from './bookCredits';

/**
 * R6-2: an MT-only book (published as machine-translated previews, MT banner shown)
 * must NOT credit a named human translator. Biology is human-translated in principle
 * but only 2/47 chapters are live; until faithful biology exists it ships as a preview
 * and the credit must read as machine translation — never "Þýðandi: <human>".
 */
describe('MT-only biology credit (R6-2)', () => {
	const bio = getBook('liffraedi-2e');

	it('exists as a book config', () => {
		expect(bio).toBeDefined();
	});

	it('is classified as a preview until faithful biology exists', () => {
		expect(bio?.status).toBe('preview');
	});

	it('renders the machine credit, not a named human translator', () => {
		const { label, value } = compactCreditPair(
			bio!.status,
			bio!.attribution.translators
		);
		expect(label).toBe('Þýðing');
		expect(value).toBe(MACHINE_TRANSLATION_CREDIT);
	});

	it('never surfaces the human translator name in the compact credit line', () => {
		const line = creditLine('liffraedi-2e', bio!.status, bio!.attribution.translators);
		expect(line).not.toMatch(/Þórhallur/);
	});
});
