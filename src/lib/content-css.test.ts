import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Vitest runs with the repo root as the working directory (see vitest.config.ts).
const CONTENT_CSS = readFileSync(join(process.cwd(), 'static/styles/content.css'), 'utf8');

/**
 * Cross-repo CSS contract (R6-5). The CNXML pipeline (namsbokasafn-efni) emits
 * biology feature boxes as `<aside class="note note-visual-connection">` (single
 * hyphenated class), mirroring the working `note-interactive` form. A stale
 * compound selector (`aside.note.visual-connection`) matches nothing, leaving
 * ~214 boxes unstyled. Guard the corrected selectors against regression.
 */
describe('content.css biology note selectors (R6-5)', () => {
	// The classes efni actually emits (verified against synced liffraedi-2e HTML).
	const EMITTED = ['note-visual-connection', 'note-evolution', 'note-career'];

	for (const cls of EMITTED) {
		it(`styles aside.${cls} (hyphenated, as emitted)`, () => {
			expect(CONTENT_CSS).toContain(`aside.${cls}`);
		});

		it(`does not use the dead compound selector aside.note.${cls.replace('note-', '')}`, () => {
			expect(CONTENT_CSS).not.toContain(`aside.note.${cls.replace('note-', '')}`);
		});
	}
});

/**
 * Alpha list marker contract (R5-1). The CNXML pipeline (efni Task E5) emits enumerated
 * lists with an inline `style="list-style-type: lower-alpha|upper-alpha"`. The decimal
 * default must be scoped so it never overrides that inline marker (a,b,c,d option lists
 * must match their letter answer key).
 */
describe('content.css enumerated-list marker (R5-1)', () => {
	it('scopes the decimal default so an inline list-style-type wins', () => {
		// Quote style is normalised by Prettier — accept either.
		expect(CONTENT_CSS).toMatch(/ol:not\(\[style\*=["']list-style-type["']\]\)/);
	});

	it('does not force decimal unconditionally on every ol', () => {
		// The bare `article.cnx-module ol { … }` block must not set list-style-type.
		const bareOl = CONTENT_CSS.match(/article\.cnx-module ol \{[^}]*\}/);
		expect(bareOl?.[0]).not.toMatch(/list-style-type/);
	});
});

/**
 * Acidic/ionizable-H marker (P0-9, pairs with efni Task E8). `<em class="emphasis-one">`
 * marks the dissociable H in ionization-constant tables; it must render bold and coloured
 * rather than the plain italic of a bare <em>.
 */
describe('content.css emphasis-one marker (P0-9)', () => {
	it('defines a rule for em.emphasis-one', () => {
		expect(CONTENT_CSS).toContain('em.emphasis-one');
	});

	it('defines the emphasis-one colour variable (light + dark)', () => {
		const defs = CONTENT_CSS.match(/--emphasis-one-color:/g) ?? [];
		expect(defs.length).toBeGreaterThanOrEqual(2);
	});
});
