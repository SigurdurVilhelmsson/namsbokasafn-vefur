/**
 * TOC format helpers for v1/v2 compatibility
 *
 * Supports both v1 format (explicit slugs) and v2 format (number-derived paths).
 *
 * v1 format: chapters have `slug` field, sections have `slug` field
 * v2 format: chapters have `number` only, sections have `file` only
 *
 * Note: This logic is duplicated in scripts/validate-content.js for Node.js usage.
 * Keep both in sync when making changes.
 */

export interface TocChapter {
	number: number;
	title: string;
	slug?: string; // v1 only
	sections: TocSection[];
}

export interface TocSection {
	number: string;
	title: string;
	slug?: string; // v1 only
	file: string;
	type?: string;
}

/**
 * Get chapter directory name (supports both v1 and v2 formats)
 * v1: uses chapter.slug directly (e.g., "01-grunnhugmyndir")
 * v2: derives from chapter.number with zero-padding (e.g., "01")
 */
export function getChapterDir(chapter: TocChapter): string {
	if (chapter.slug) {
		return chapter.slug; // v1 format
	}
	// v2 format: zero-padded chapter number
	return String(chapter.number).padStart(2, '0');
}

/**
 * Get section slug (supports both v1 and v2 formats)
 * v1: uses section.slug directly
 * v2: derives from section.file by removing .md extension
 */
export function getSectionSlug(section: TocSection): string {
	if (section.slug) {
		return section.slug; // v1 format
	}
	// v2 format: file name without .md extension
	return section.file.replace(/\.md$/, '');
}

/**
 * Detect which TOC format is being used
 */
export function detectTocFormat(chapters: TocChapter[]): 'v1' | 'v2' | 'unknown' {
	if (!chapters || chapters.length === 0) {
		return 'unknown';
	}

	const firstChapter = chapters[0];

	// v1 has explicit slug on chapters
	if (firstChapter.slug) {
		return 'v1';
	}

	// v2 has number but no slug
	if (typeof firstChapter.number === 'number' && !firstChapter.slug) {
		return 'v2';
	}

	return 'unknown';
}
