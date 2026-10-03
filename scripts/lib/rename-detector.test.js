import { describe, it, expect } from 'vitest';
import {
	renamesFromMap,
	renameToUrlParts,
	missingRedirects,
	suggestionLine
} from './rename-detector.js';

const MAP = {
	book: 'efnafraedi-2e',
	track: 'mt-preview',
	contract: 'C9 — prose for humans; never parsed.',
	renames: {
		'chapters/10/10-5-fast-astand-efnis.html': {
			to: 'chapters/10/10-5-fastur-efnishamur.html',
			moduleId: 'm68770',
			recordedAt: '2026-08-18'
		}
	}
};

describe('renamesFromMap', () => {
	it('reads the renames block', () => {
		expect(renamesFromMap(MAP)).toEqual([
			{
				from: 'chapters/10/10-5-fast-astand-efnis.html',
				to: 'chapters/10/10-5-fastur-efnishamur.html',
				moduleId: 'm68770'
			}
		]);
	});

	// efni: chain-collapse should never emit this, but a hand-edited or
	// corrupted map could, and it is a redirect loop.
	it('skips an entry that maps a file onto itself', () => {
		const selfMap = {
			renames: { 'chapters/10/a.html': { to: 'chapters/10/a.html', moduleId: 'm1' } }
		};
		expect(renamesFromMap(selfMap)).toEqual([]);
	});

	// An absent map means "no redirects", not an error. The reconcile is
	// best-effort on efni's side and the file only exists once a prune happens.
	it('treats a missing or malformed map as no renames', () => {
		expect(renamesFromMap(null)).toEqual([]);
		expect(renamesFromMap({})).toEqual([]);
		expect(renamesFromMap({ renames: 'nonsense' })).toEqual([]);
	});

	it('ignores an entry with no "to"', () => {
		expect(renamesFromMap({ renames: { 'chapters/10/a.html': { moduleId: 'm1' } } })).toEqual([]);
	});
});

describe('renameToUrlParts', () => {
	it('derives chapter dir and slug from a track-relative path', () => {
		expect(renameToUrlParts('chapters/10/10-5-fastur-efnishamur.html')).toEqual({
			chapterDir: '10',
			slug: '10-5-fastur-efnishamur'
		});
	});

	it('handles front matter in chapter 00', () => {
		expect(renameToUrlParts('chapters/00/formali.html')).toEqual({
			chapterDir: '00',
			slug: 'formali'
		});
	});

	// Appendix URLs are ORDINAL-derived (/vidauki/<letter>, generate-toc.js),
	// so renaming an appendix file changes no URL and needs no redirect.
	it('returns null for an appendix path', () => {
		expect(renameToUrlParts('appendices/A-lotukerfi.html')).toBeNull();
	});

	it('returns null for anything that is not a chapter page', () => {
		expect(renameToUrlParts('glossary.json')).toBeNull();
		expect(renameToUrlParts('chapters/10/nested/deep.html')).toBeNull();
	});
});

describe('missingRedirects', () => {
	const renames = renamesFromMap(MAP);

	it('reports a rename that SECTION_REDIRECTS does not cover', () => {
		const missing = missingRedirects('efnafraedi-2e', renames, []);
		expect(missing).toHaveLength(1);
		expect(missing[0].fromSlug).toBe('10-5-fast-astand-efnis');
		expect(missing[0].toSlug).toBe('10-5-fastur-efnishamur');
		expect(missing[0].moduleId).toBe('m68770');
	});

	// CONTROL: the covered case must report nothing, or the warning becomes
	// noise everyone learns to ignore.
	it('reports nothing once the redirect exists', () => {
		const covered = [
			{
				bookSlug: 'efnafraedi-2e',
				fromChapter: '10',
				fromSlug: '10-5-fast-astand-efnis',
				toChapter: '10',
				toSlug: '10-5-fastur-efnishamur'
			}
		];
		expect(missingRedirects('efnafraedi-2e', renames, covered)).toEqual([]);
	});

	it('does not treat another book’s redirect as coverage', () => {
		const otherBook = [
			{
				bookSlug: 'liffraedi-2e',
				fromChapter: '10',
				fromSlug: '10-5-fast-astand-efnis',
				toChapter: '10',
				toSlug: '10-5-fastur-efnishamur'
			}
		];
		expect(missingRedirects('efnafraedi-2e', renames, otherBook)).toHaveLength(1);
	});

	it('skips appendix renames, which change no URL', () => {
		const appendixRenames = renamesFromMap({
			renames: { 'appendices/A-old.html': { to: 'appendices/A-new.html', moduleId: 'm2' } }
		});
		expect(missingRedirects('efnafraedi-2e', appendixRenames, [])).toEqual([]);
	});
});

describe('suggestionLine', () => {
	it('emits a paste-ready SECTION_REDIRECTS entry', () => {
		const [entry] = missingRedirects('efnafraedi-2e', renamesFromMap(MAP), []);
		const line = suggestionLine(entry);

		expect(line).toContain("bookSlug: 'efnafraedi-2e'");
		expect(line).toContain("fromChapter: '10'");
		expect(line).toContain("fromSlug: '10-5-fast-astand-efnis'");
		expect(line).toContain("toSlug: '10-5-fastur-efnishamur'");
		expect(line).toContain("moduleId: 'm68770'");
	});
});
