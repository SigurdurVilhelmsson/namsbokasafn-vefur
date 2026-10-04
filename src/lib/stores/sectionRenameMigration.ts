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
	let renames;
	try {
		renames = resolveActiveRenames(bookSlug, toc);
	} catch (e) {
		console.warn('Section rename migration failed:', e);
		return;
	}
	if (renames.length === 0) return;
	// One store at a time, so bad data in one cannot stop the others migrating,
	// and a migration problem never stops the book from loading
	for (const [name, store] of [
		['reader', reader],
		['annotations', annotationStore],
		['analytics', analyticsStore],
		['objectives', objectivesStore],
		['quiz', quizStore]
	] as const) {
		try {
			store.renameSections(renames);
		} catch (e) {
			console.warn(`Section rename migration failed for ${name}:`, e);
		}
	}
}
