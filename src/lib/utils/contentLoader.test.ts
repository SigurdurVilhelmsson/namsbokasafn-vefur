/**
 * Tests for content loading utilities
 */

import { describe, it, expect, vi } from 'vitest';
import {
	getChapterPath,
	getSectionPath,
	getChapterFolder,
	findChapterBySlug,
	findSectionBySlug,
	getAppendixPath,
	findAppendixByLetter,
	ContentLoadError,
	loadTableOfContents,
	loadSectionContent
} from './contentLoader';
import type { TableOfContents } from '$lib/types/content';

// Sample TOC for lookup tests
const sampleToc: TableOfContents = {
	title: 'Efnafræði',
	chapters: [
		{
			number: 1,
			title: 'Grunnhugmyndir',
			slug: '01-grunnhugmyndir',
			sections: [
				{ number: '1.1', title: 'Efnafræði', file: '1-1-efnafraedi.html', slug: '1-1-efnafraedi' },
				{ number: '1.2', title: 'Frumefnin', file: '1-2-frumefnin.html', slug: '1-2-frumefnin' },
				{ number: '', title: 'Inngangur', file: '1-0-introduction.html', type: 'introduction' }
			]
		},
		{
			number: 2,
			title: 'Atóm og sameindir',
			sections: [
				{ number: '2.1', title: 'Atómkenningin', file: '2-1-atomkenningin.html' }
			]
		}
	],
	appendices: [
		{ letter: 'A', title: 'Lotukerfið', file: 'A-periodic-table.html' },
		{ letter: 'B', title: 'Stuðlar', file: 'B-constants.html' }
	]
};

describe('contentLoader utilities', () => {
	// ============================================
	// Path generation helpers
	// ============================================
	describe('getChapterPath', () => {
		it('should zero-pad single digit chapter numbers', () => {
			expect(getChapterPath({ number: 1 })).toBe('01');
			expect(getChapterPath({ number: 9 })).toBe('09');
		});

		it('should not pad double digit chapter numbers', () => {
			expect(getChapterPath({ number: 10 })).toBe('10');
			expect(getChapterPath({ number: 15 })).toBe('15');
		});
	});

	describe('getSectionPath', () => {
		it('should convert dots to hyphens for numbered sections', () => {
			expect(getSectionPath({ number: '2.1' })).toBe('2-1');
			expect(getSectionPath({ number: '1.10' })).toBe('1-10');
		});

		it('should use file basename for unnumbered sections', () => {
			expect(getSectionPath({ number: '', file: '1-0-introduction.html' })).toBe('1-0-introduction');
			expect(getSectionPath({ number: '', file: '1-key-terms.html' })).toBe('1-key-terms');
		});

		it('should fall back to slug', () => {
			expect(getSectionPath({ number: '', slug: 'my-section' })).toBe('my-section');
		});

		it('should return empty string as last resort', () => {
			expect(getSectionPath({ number: '' })).toBe('');
		});
	});

	describe('getChapterFolder', () => {
		it('should use slug if present (v1)', () => {
			expect(getChapterFolder({ number: 1, slug: '01-grunnhugmyndir' })).toBe('01-grunnhugmyndir');
		});

		it('should use padded number if no slug (v2)', () => {
			expect(getChapterFolder({ number: 2 })).toBe('02');
		});
	});

	// ============================================
	// Chapter and section lookup
	// ============================================
	describe('findChapterBySlug', () => {
		it('should find by v1 slug', () => {
			const ch = findChapterBySlug(sampleToc, '01-grunnhugmyndir');
			expect(ch?.number).toBe(1);
		});

		it('should find by v2 padded number', () => {
			const ch = findChapterBySlug(sampleToc, '02');
			expect(ch?.number).toBe(2);
		});

		it('should find by unpadded number', () => {
			const ch = findChapterBySlug(sampleToc, '2');
			expect(ch?.number).toBe(2);
		});

		it('should return undefined for non-existent chapter', () => {
			expect(findChapterBySlug(sampleToc, '99')).toBeUndefined();
		});
	});

	describe('findSectionBySlug', () => {
		it('should find by v1 slug', () => {
			const result = findSectionBySlug(sampleToc, '01-grunnhugmyndir', '1-1-efnafraedi');
			expect(result?.section.number).toBe('1.1');
		});

		it('should find by v2 number (hyphen notation)', () => {
			const result = findSectionBySlug(sampleToc, '01', '1-1');
			expect(result?.section.title).toBe('Efnafræði');
		});

		it('should find unnumbered sections by file basename', () => {
			const result = findSectionBySlug(sampleToc, '01', '1-0-introduction');
			expect(result?.section.type).toBe('introduction');
		});

		it('should return null for non-existent chapter', () => {
			expect(findSectionBySlug(sampleToc, '99', '1-1')).toBeNull();
		});

		it('should return null for non-existent section', () => {
			expect(findSectionBySlug(sampleToc, '01', '1-99')).toBeNull();
		});
	});

	// ============================================
	// Appendix helpers
	// ============================================
	describe('getAppendixPath', () => {
		it('should return the letter', () => {
			expect(getAppendixPath({ letter: 'A', title: 'T', file: 'f' })).toBe('A');
		});
	});

	describe('findAppendixByLetter', () => {
		it('should find appendix by letter (case insensitive)', () => {
			expect(findAppendixByLetter(sampleToc, 'a')?.title).toBe('Lotukerfið');
			expect(findAppendixByLetter(sampleToc, 'B')?.title).toBe('Stuðlar');
		});

		it('should return undefined for non-existent appendix', () => {
			expect(findAppendixByLetter(sampleToc, 'Z')).toBeUndefined();
		});

		it('should return undefined when no appendices exist', () => {
			const tocNoAppendices: TableOfContents = { title: 'Test', chapters: [] };
			expect(findAppendixByLetter(tocNoAppendices, 'A')).toBeUndefined();
		});
	});

	// ============================================
	// ContentLoadError
	// ============================================
	describe('ContentLoadError', () => {
		it('should set name to ContentLoadError', () => {
			const err = new ContentLoadError('test');
			expect(err.name).toBe('ContentLoadError');
		});

		it('should store statusCode and isOffline', () => {
			const err = new ContentLoadError('offline', 0, true);
			expect(err.statusCode).toBe(0);
			expect(err.isOffline).toBe(true);
		});

		it('should default statusCode to 0 and isOffline to false', () => {
			const err = new ContentLoadError('error');
			expect(err.statusCode).toBe(0);
			expect(err.isOffline).toBe(false);
		});
	});

	// ============================================
	// loadTableOfContents
	// ============================================
	describe('loadTableOfContents', () => {
		it('should fetch and return TOC', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(sampleToc)
			});

			const toc = await loadTableOfContents('efnafraedi', mockFetch as unknown as typeof fetch);
			expect(toc.title).toBe('Efnafræði');
			expect(mockFetch).toHaveBeenCalledWith('/content/efnafraedi/toc.json');
		});

		it('should throw ContentLoadError on HTTP error', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 404
			});

			await expect(
				loadTableOfContents('missing', mockFetch as unknown as typeof fetch)
			).rejects.toThrow(ContentLoadError);
		});

		it('should throw ContentLoadError on network error', async () => {
			const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

			await expect(
				loadTableOfContents('test', mockFetch as unknown as typeof fetch)
			).rejects.toThrow(ContentLoadError);
		});
	});

	// ============================================
	// loadSectionContent
	// ============================================
	describe('loadSectionContent', () => {
		it('should load HTML content with page-data', async () => {
			const html = `
				<script id="page-data">{"title":"Test","chapter":1,"section":"1.1"}</script>
				<article><p>Content here</p></article>
			`;
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				text: () => Promise.resolve(html)
			});

			const result = await loadSectionContent('book', '01', 'section.html', mockFetch as unknown as typeof fetch);
			expect(result.title).toBe('Test');
			expect(result.chapter).toBe(1);
			expect(result.section).toBe('1.1');
		});

		it('should load HTML content with preloaded metadata', async () => {
			const html = '<article><p>Content</p></article>';
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				text: () => Promise.resolve(html)
			});

			const result = await loadSectionContent(
				'book', '01', 'section.html',
				mockFetch as unknown as typeof fetch,
				{ title: 'Preloaded', section: '1.1', chapter: 1, readingTime: 10 }
			);
			expect(result.title).toBe('Preloaded');
			expect(result.readingTime).toBe(10);
		});

		it('should throw ContentLoadError on fetch failure', async () => {
			const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

			await expect(
				loadSectionContent('book', '01', 'section.html', mockFetch as unknown as typeof fetch)
			).rejects.toThrow(ContentLoadError);
		});

		it('should throw ContentLoadError on HTTP error', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 404
			});

			await expect(
				loadSectionContent('book', '01', 'section.html', mockFetch as unknown as typeof fetch)
			).rejects.toThrow(ContentLoadError);
		});

	});
});
