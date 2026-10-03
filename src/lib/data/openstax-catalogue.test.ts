import { describe, it, expect } from 'vitest';
import { getTier1Entries, getTier2Entries } from './openstax-catalogue';
import { getBook } from '$lib/types/book';

const allEntries = () => [...getTier1Entries(), ...Object.values(getTier2Entries()).flat()];

describe('openstax catalogue', () => {
	// A Tier 1 entry links to /<bookSlug>/; one the reader does not serve
	// leads to a 404 from the front page.
	it('links only to books the site serves', () => {
		for (const entry of getTier1Entries()) {
			expect(getBook(entry.bookSlug!), entry.bookSlug).toBeDefined();
		}
	});

	// 2026-09-23 ruling: organic chemistry comes out of the catalogue, not just
	// off Tier 1. Demoted to Tier 2 it would still be listed as an OpenStax title
	// awaiting translation, which OpenStax has said it cannot authorise.
	it('does not list Organic Chemistry at all', () => {
		expect(allEntries().map((e) => e.slug)).not.toContain('organic-chemistry');
	});
});
