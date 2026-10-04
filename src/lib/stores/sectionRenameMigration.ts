/**
 * Apply a book's active section renames to every store that keeps reader
 * state by section. Called by loadTableOfContents, so it runs whenever a book's
 * table of contents loads in the browser: on every book page (the header and
 * sidebar load it), and before a section page renders, so highlights are
 * restored under the new slug. Cheap and idempotent; see sectionRenames.ts.
 */

import { browser } from '$app/environment';
import type { TableOfContents } from '$lib/types/content';
import { resolveActiveRenames } from '$lib/utils/sectionRenames';
import { reader } from './reader';
import { annotationStore } from './annotation';
import { analyticsStore } from './analytics';
import { objectivesStore } from './objectives';
import { quizStore } from './quiz';

export function migrateRenamedSections(bookSlug: string, toc: TableOfContents): void {
	if (!browser) return;
	try {
		const renames = resolveActiveRenames(bookSlug, toc);
		if (renames.length === 0) return;
		reader.renameSections(renames);
		annotationStore.renameSections(renames);
		analyticsStore.renameSections(renames);
		objectivesStore.renameSections(renames);
		quizStore.renameSections(renames);
	} catch (e) {
		// Never let a migration problem stop the book from loading
		console.warn('Section rename migration failed:', e);
	}
}
