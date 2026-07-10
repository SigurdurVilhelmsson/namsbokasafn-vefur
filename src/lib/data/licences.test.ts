import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
	LICENCES,
	getLicence,
	mostRestrictive,
	validateAttribution,
	type BookAttribution
} from './licences';

// Vitest runs with the repo root as the working directory (see vitest.config.ts).
const REPO_ROOT = process.cwd();

/** A complete, valid CC BY attribution fixture. */
function validByAttribution(): BookAttribution {
	return {
		bookKey: 'efnafraedi-2e',
		originalTitle: 'Chemistry 2e',
		originalAuthors: ['Paul Flowers', 'Klaus Theopold'],
		publisher: 'OpenStax, Rice University',
		sourceUrl: 'https://openstax.org/details/books/chemistry-2e',
		translators: 'Sigurður E. Vilhelmsson',
		modifications: 'Íslensk þýðing og staðfærsla.',
		derivativeLicence: 'CC-BY-4.0',
		derivativeLicenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
		provenanceRef: '/provenance/provenance.md',
		sources: [
			{
				format: 'cnxml',
				obtained: '2026-01-19',
				licenceAtObtaining: 'CC-BY-4.0',
				licenceUrl: 'https://creativecommons.org/licenses/by/4.0/'
			}
		]
	};
}

describe('getLicence', () => {
	it('returns the descriptor for a known code', () => {
		expect(getLicence('CC-BY-4.0').name).toBe('CC BY 4.0');
	});

	it('marks CC BY as neither NonCommercial nor ShareAlike', () => {
		const l = getLicence('CC-BY-4.0');
		expect(l.nonCommercial).toBe(false);
	});

	it('marks NC-SA as NonCommercial', () => {
		expect(getLicence('CC-BY-NC-SA-4.0').nonCommercial).toBe(true);
	});

	it('marks NC-SA as ShareAlike', () => {
		expect(getLicence('CC-BY-NC-SA-4.0').shareAlike).toBe(true);
	});

	it('throws on an unknown code', () => {
		// @ts-expect-error testing runtime guard with an invalid code
		expect(() => getLicence('CC-BY-ND-4.0')).toThrow();
	});
});

describe('mostRestrictive', () => {
	it('returns CC BY when every source is CC BY', () => {
		expect(mostRestrictive(['CC-BY-4.0', 'CC-BY-4.0'])).toBe('CC-BY-4.0');
	});

	it('returns NC-SA when any source is NC-SA', () => {
		expect(mostRestrictive(['CC-BY-4.0', 'CC-BY-NC-SA-4.0'])).toBe('CC-BY-NC-SA-4.0');
	});

	it('returns NC-SA when all sources are NC-SA', () => {
		expect(mostRestrictive(['CC-BY-NC-SA-4.0'])).toBe('CC-BY-NC-SA-4.0');
	});

	it('throws on an empty source list', () => {
		expect(() => mostRestrictive([])).toThrow();
	});
});

describe('validateAttribution', () => {
	it('reports no errors for a complete, consistent attribution', () => {
		expect(validateAttribution(validByAttribution())).toEqual([]);
	});

	it('flags a missing required field', () => {
		const a = validByAttribution();
		a.originalTitle = '';
		expect(validateAttribution(a).join(' ')).toMatch(/originalTitle/);
	});

	it('flags an empty authors array', () => {
		const a = validByAttribution();
		a.originalAuthors = [];
		expect(validateAttribution(a).join(' ')).toMatch(/originalAuthors/);
	});

	it('flags an empty sources array', () => {
		const a = validByAttribution();
		a.sources = [];
		expect(validateAttribution(a).join(' ')).toMatch(/sources/);
	});

	it('flags a derivativeLicence that is not the most-restrictive source licence', () => {
		const a = validByAttribution();
		// One NC-SA source but the book still claims CC BY — the exposure this guard exists to catch.
		a.sources.push({
			format: 'cnxml',
			obtained: '2026-03-23',
			licenceAtObtaining: 'CC-BY-NC-SA-4.0',
			licenceUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/'
		});
		expect(validateAttribution(a).join(' ')).toMatch(/derivativeLicence/);
	});

	it('accepts NC-SA derivative when a source is NC-SA', () => {
		const a = validByAttribution();
		a.derivativeLicence = 'CC-BY-NC-SA-4.0';
		a.derivativeLicenceUrl = 'https://creativecommons.org/licenses/by-nc-sa/4.0/';
		a.sources[0].licenceAtObtaining = 'CC-BY-NC-SA-4.0';
		expect(validateAttribution(a)).toEqual([]);
	});
});

describe('LICENCES table', () => {
	it('every descriptor carries an Icelandic-facing licence name and url', () => {
		for (const code of Object.keys(LICENCES) as Array<keyof typeof LICENCES>) {
			expect(LICENCES[code].name).toBeTruthy();
			expect(LICENCES[code].url).toMatch(/^https:\/\/creativecommons\.org/);
		}
	});
});

/**
 * No-commingling gate (R6-1). The catalogue carries two licences — CC BY 4.0 and
 * CC BY-NC-SA 4.0 (Organic Chemistry + College Physics). No aggregate/shared view
 * may present "CC BY 4.0" as a site-wide claim: every mention in these surfaces
 * must sit next to an acknowledgement of the NC-SA alternative. Per-book surfaces
 * (bookCredits, book.ts, LicenceBadge) are data-driven and out of scope here.
 */
describe('no blanket "CC BY 4.0" claim in aggregate views (R6-1)', () => {
	// Print routes render licence text (colophon, full-book, chapter); scan them all so
	// a future blanket claim in any print template is caught, not just today's files.
	const printFiles = readdirSync(join(REPO_ROOT, 'src/routes/print'), { recursive: true })
		.map((p) => String(p))
		.filter((p) => p.endsWith('.svelte'))
		.map((p) => `src/routes/print/${p}`);

	// Shared/aggregate surfaces that speak for the whole catalogue (plan: landing/FAQ/meta/print).
	const AGGREGATE_VIEW_FILES = [
		'src/routes/+page.svelte', // landing: about-card + footer
		'src/lib/data/faq.ts', // FAQ (rendered on the landing page)
		'src/app.html', // document shell / meta
		...printFiles
	];
	const BLANKET = 'CC BY 4.0';
	// The NC-SA counterpart (label "CC BY-NC-SA 4.0" or the by-nc-sa/ url) must
	// appear within this many characters of every plain-CC-BY mention.
	const NEAR = 240;

	for (const rel of AGGREGATE_VIEW_FILES) {
		it(`${rel} qualifies every "${BLANKET}" with the NC-SA alternative`, () => {
			const src = readFileSync(join(REPO_ROOT, rel), 'utf8');
			for (let idx = src.indexOf(BLANKET); idx !== -1; idx = src.indexOf(BLANKET, idx + 1)) {
				const context = src.slice(Math.max(0, idx - NEAR), idx + BLANKET.length + NEAR);
				expect(
					/nc-sa/i.test(context),
					`Unqualified "${BLANKET}" at index ${idx} in ${rel} — an aggregate view must also name CC BY-NC-SA 4.0 (two-licence catalogue).`
				).toBe(true);
			}
		});
	}
});
