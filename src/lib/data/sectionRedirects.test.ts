import { describe, it, expect } from 'vitest';
import {
	SECTION_REDIRECTS,
	findSectionRedirect,
	exactSectionExists,
	type SectionRedirect
} from './sectionRedirects';
import type { TableOfContents } from '$lib/types/content';

/**
 * A TOC carrying only the renamed section's NEW file, i.e. the post-prune
 * state the redirect is meant to serve.
 */
function tocWithNewSection(): TableOfContents {
	return {
		title: 'Efnafræði 2e',
		chapters: [
			{
				number: 10,
				title: 'Vökvar og fastefni',
				sections: [
					{ number: '10.4', title: 'Fasarit', file: '10-4-fasarit.html' },
					{ number: '10.5', title: 'Fastur efnishamur', file: '10-5-fastur-efnishamur.html' }
				]
			}
		]
	};
}

describe('SECTION_REDIRECTS data invariants', () => {
	it('never maps a slug onto itself', () => {
		const selfLoops = SECTION_REDIRECTS.filter(
			(r) => r.fromChapter === r.toChapter && r.fromSlug === r.toSlug
		);
		expect(selfLoops).toEqual([]);
	});

	it('records the chemistry ch10 rename (efni slug-map m68770)', () => {
		expect(SECTION_REDIRECTS).toContainEqual(
			expect.objectContaining({
				bookSlug: 'efnafraedi-2e',
				fromSlug: '10-5-fast-astand-efnis',
				toSlug: '10-5-fastur-efnishamur'
			})
		);
	});

	// edlisfraedi-2e has no slug map at all, so nothing warns about these four.
	// They are pinned here ahead of the sync that publishes their targets.
	it.each([
		['4-1-throun-krafthugtaksins', '4-1-throun-kraftshugtaksins'],
		[
			'4-5-thverkraftur-spenna-og-onnur-daemi-um-krafta',
			'4-5-thverkraftur-togkraftur-og-onnur-daemi-um-krafta'
		],
		['4-6-lausn-vandamala', '4-6-lausnaradferdir-vid-urlausn-verkefna'],
		[
			'4-8-itarefni-inngangur-ad-grunnkroftunum-fjorum',
			'4-8-itarefni-grunnkraftarnir-fjorir-inngangur'
		]
	])('records the physics ch04 rename %s', (fromSlug, toSlug) => {
		expect(SECTION_REDIRECTS).toContainEqual(
			expect.objectContaining({ bookSlug: 'edlisfraedi-2e', fromSlug, toSlug })
		);
	});

	// This one is NOT in efni's slug map — the C56 re-render predates §C9, so the
	// rename detector cannot see it. Pinning it here is the only thing standing
	// between the old URL and a 404.
	it('records the chemistry ch20 rename (m68848, pre-§C9, unmapped)', () => {
		expect(SECTION_REDIRECTS).toContainEqual(
			expect.objectContaining({
				bookSlug: 'efnafraedi-2e',
				fromSlug: '20-3-aldehyd-ketonar-karboxylsyrur-og-estrar',
				toSlug: '20-3-aldehyd-keton-karboxylsyrur-og-estrar'
			})
		);
	});
});

describe('findSectionRedirect', () => {
	it('resolves the old slug to the new one', () => {
		const r = findSectionRedirect('efnafraedi-2e', '10', '10-5-fast-astand-efnis');
		expect(r?.toSlug).toBe('10-5-fastur-efnishamur');
	});

	// CONTROL: a from/to swap would make this return a redirect, producing a
	// self-referential hop on a page that is perfectly fine.
	it('returns null for the NEW slug', () => {
		expect(findSectionRedirect('efnafraedi-2e', '10', '10-5-fastur-efnishamur')).toBeNull();
	});

	it('returns null for an unrelated slug', () => {
		expect(findSectionRedirect('efnafraedi-2e', '10', '10-4-fasarit')).toBeNull();
	});

	it('does not match across books', () => {
		expect(findSectionRedirect('liffraedi-2e', '10', '10-5-fast-astand-efnis')).toBeNull();
	});

	it('does not match across chapters', () => {
		expect(findSectionRedirect('efnafraedi-2e', '11', '10-5-fast-astand-efnis')).toBeNull();
	});
});

describe('exactSectionExists', () => {
	it('finds a section by exact file basename', () => {
		expect(exactSectionExists(tocWithNewSection(), '10', '10-5-fastur-efnishamur')).toBe(true);
	});

	// CONTROL: this is what makes the redirect fall through rather than point
	// at a 404. Our own overlay can delete a page efni named as the target.
	it('returns false when the target section is absent', () => {
		const toc: TableOfContents = { title: 'Efnafræði 2e', chapters: [] };
		expect(exactSectionExists(toc, '10', '10-5-fastur-efnishamur')).toBe(false);
	});

	it('does not fall back to a numbered-slug match', () => {
		// findSectionBySlug would resolve "10-5" via its 1-1 -> 1.1 fallback.
		// exactSectionExists must not, or it would report the wrong section live.
		expect(exactSectionExists(tocWithNewSection(), '10', '10-5')).toBe(false);
	});

	it('returns false for a chapter that is not in the TOC', () => {
		expect(exactSectionExists(tocWithNewSection(), '99', '10-5-fastur-efnishamur')).toBe(false);
	});

	// Front matter lives in chapter dir "00" and is NOT part of toc.chapters.
	// Those pages carry module ids and title-derived slugs too, so a rename can
	// land here and the target must still be findable.
	it('finds a front-matter section in chapter 00', () => {
		const toc: TableOfContents = {
			title: 'Efnafræði 2e',
			chapters: [],
			frontMatter: [{ number: '', title: 'Formáli', file: 'formali.html' }]
		};
		expect(exactSectionExists(toc, '00', 'formali')).toBe(true);
	});

	it('returns false for an absent front-matter section', () => {
		const toc: TableOfContents = {
			title: 'Efnafræði 2e',
			chapters: [],
			frontMatter: [{ number: '', title: 'Formáli', file: 'formali.html' }]
		};
		expect(exactSectionExists(toc, '00', 'inngangur')).toBe(false);
	});
});

describe('every redirect target is internally consistent', () => {
	it.each(SECTION_REDIRECTS)(
		'$bookSlug $fromSlug -> $toSlug has non-empty slugs',
		(r: SectionRedirect) => {
			expect(r.fromSlug.length).toBeGreaterThan(0);
			expect(r.toSlug.length).toBeGreaterThan(0);
			expect(r.fromChapter).toMatch(/^\d{2}$|^appendices$/);
			expect(r.toChapter).toMatch(/^\d{2}$|^appendices$/);
		}
	);
});
