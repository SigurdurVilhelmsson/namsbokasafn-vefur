/**
 * Tests for TOC format helpers
 *
 * These tests ensure both v1 (explicit slugs) and v2 (number-derived paths)
 * TOC formats are handled correctly.
 */

import { describe, it, expect } from 'vitest';
import {
	getChapterDir,
	getSectionSlug,
	detectTocFormat,
	type TocChapter,
	type TocSection
} from './tocFormat';

describe('tocFormat helpers', () => {
	describe('getChapterDir', () => {
		it('should return slug for v1 format chapter', () => {
			const chapter: TocChapter = {
				number: 1,
				title: 'Grunnhugmyndir',
				slug: '01-grunnhugmyndir',
				sections: []
			};
			expect(getChapterDir(chapter)).toBe('01-grunnhugmyndir');
		});

		it('should derive zero-padded directory for v2 format chapter', () => {
			const chapter: TocChapter = {
				number: 1,
				title: 'Grunnhugmyndir',
				sections: []
			};
			expect(getChapterDir(chapter)).toBe('01');
		});

		it('should handle double-digit chapter numbers in v2 format', () => {
			const chapter: TocChapter = {
				number: 12,
				title: 'Some Chapter',
				sections: []
			};
			expect(getChapterDir(chapter)).toBe('12');
		});

		it('should pad single-digit chapter numbers in v2 format', () => {
			const chapter: TocChapter = {
				number: 5,
				title: 'Some Chapter',
				sections: []
			};
			expect(getChapterDir(chapter)).toBe('05');
		});
	});

	describe('getSectionSlug', () => {
		it('should return slug for v1 format section', () => {
			const section: TocSection = {
				number: '1.1',
				title: 'Efnafræði í samhengi',
				slug: '1-1-efnafraedi-i-samhengi',
				file: '1-1-efnafraedi-i-samhengi.md'
			};
			expect(getSectionSlug(section)).toBe('1-1-efnafraedi-i-samhengi');
		});

		it('should derive slug from filename for v2 format section', () => {
			const section: TocSection = {
				number: '1.1',
				title: 'Efnafræði í samhengi',
				file: '1-1-chemistry-in-context.md'
			};
			expect(getSectionSlug(section)).toBe('1-1-chemistry-in-context');
		});

		it('should handle introduction sections in v2 format', () => {
			const section: TocSection = {
				number: '1.0',
				title: 'Inngangur',
				file: '1-0-introduction.md'
			};
			expect(getSectionSlug(section)).toBe('1-0-introduction');
		});

		it('should handle special section types in v2 format', () => {
			const section: TocSection = {
				number: '1.7',
				title: 'Lykilhugtök',
				file: '1-7-key-terms.md',
				type: 'glossary'
			};
			expect(getSectionSlug(section)).toBe('1-7-key-terms');
		});
	});

	describe('detectTocFormat', () => {
		it('should detect v1 format when chapters have slugs', () => {
			const chapters: TocChapter[] = [
				{
					number: 1,
					title: 'Grunnhugmyndir',
					slug: '01-grunnhugmyndir',
					sections: []
				}
			];
			expect(detectTocFormat(chapters)).toBe('v1');
		});

		it('should detect v2 format when chapters have no slugs', () => {
			const chapters: TocChapter[] = [
				{
					number: 1,
					title: 'Grunnhugmyndir',
					sections: []
				}
			];
			expect(detectTocFormat(chapters)).toBe('v2');
		});

		it('should return unknown for empty chapters array', () => {
			expect(detectTocFormat([])).toBe('unknown');
		});
	});

	describe('v2 format integration', () => {
		it('should correctly process a complete v2 chapter structure', () => {
			const chapter: TocChapter = {
				number: 2,
				title: 'Atóm og sameindir',
				sections: [
					{
						number: '2.0',
						title: 'Inngangur',
						file: '2-0-introduction.md'
					},
					{
						number: '2.1',
						title: 'Fyrstu hugmyndir atómkenningarinnar',
						file: '2-1-early-ideas.md'
					},
					{
						number: '2.8',
						title: 'Lykilhugtök',
						file: '2-8-key-terms.md',
						type: 'glossary'
					}
				]
			};

			// Chapter directory should be zero-padded number
			expect(getChapterDir(chapter)).toBe('02');

			// Section slugs should be derived from filenames
			expect(getSectionSlug(chapter.sections[0])).toBe('2-0-introduction');
			expect(getSectionSlug(chapter.sections[1])).toBe('2-1-early-ideas');
			expect(getSectionSlug(chapter.sections[2])).toBe('2-8-key-terms');
		});
	});
});
