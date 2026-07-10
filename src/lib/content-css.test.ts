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
