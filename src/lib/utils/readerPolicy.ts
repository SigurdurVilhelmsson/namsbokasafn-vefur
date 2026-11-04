/**
 * The reader's rules about section types, in one place (plan step S5.2, register CODE-22).
 * Typed against SectionType, so a misspelt type fails svelte-check. Each choice [USER] has
 * ruled is a named constant; nothing here presets an open call.
 */
import type { SectionType } from '$lib/types/content';
import type { ReadingMode } from '$lib/stores/settings';
import type { PagerState } from './pager';

/** The chapter rollups: pages that gather a whole chapter rather than teach one section */
export const ROLLUP_SECTION_TYPES: ReadonlySet<SectionType> = new Set<SectionType>([
	'glossary',
	'equations',
	'summary',
	'exercises',
	'answer-key'
]);

export function isRollup(type: SectionType | undefined): boolean {
	return type !== undefined && ROLLUP_SECTION_TYPES.has(type);
}

/** The front matter (Formáli) lives in chapter folder 00 and has no section type */
export const FRONT_MATTER_CHAPTER = '00';

export function isFrontMatterChapter(chapterSlug: string): boolean {
	return chapterSlug === FRONT_MATTER_CHAPTER;
}

/**
 * The unit a recall prompt covers. Call 2 was ruled per section on 2026-10-23
 * (docs/decisions/2026-10-23-reader-call2-recall-once-per-section.md).
 */
export const RECALL_GRANULARITY = 'section' as const;

/**
 * What a page offers at its end. The recall prompt belongs to a section that teaches one
 * thing: not a rollup, a chapter introduction or the front matter (call 2's type gate,
 * PED-04). The front matter has no type, so it needs the second input.
 */
export function endOfUnitActivity(type: SectionType | undefined, isFrontMatter: boolean): 'recall' | null {
	if (isFrontMatter || isRollup(type) || type === 'introduction') return null;
	return 'recall';
}

/**
 * Whether reaching a section's end opens its recall prompt. Decision D10 ruled that marking
 * a section read by hand does not open it: the prompt waits for the end of the section. So
 * the trigger is reaching the end, once per section (call 2), whether or not the section
 * was already marked read.
 */
export function recallTrigger({
	type,
	isFrontMatter,
	alreadyPrompted
}: {
	type: SectionType | undefined;
	isFrontMatter: boolean;
	alreadyPrompted: boolean;
}): typeof RECALL_GRANULARITY | null {
	if (alreadyPrompted) return null;
	return endOfUnitActivity(type, isFrontMatter) === 'recall' ? RECALL_GRANULARITY : null;
}

/** The section types the guided study session skips when it looks for unread content */
export function skippedByStudySession(type: SectionType | undefined): boolean {
	return isRollup(type) || type === 'introduction';
}

/**
 * The mode a reader who has not picked one reads in. D06 (2026-10-23) keeps the default
 * scrolled until call 3 is ruled; call 3 may later resolve it from the profile-age marker.
 */
export const UNCHOSEN_READING_MODE: ReadingMode = 'scrolled';

/**
 * The visit-only link parameter (PED-35): never stored, read in the browser only. The three
 * link words are URL text that teachers will share, so they were checked like UI strings
 * ([USER], D20 batch 9, 2026-11-04) and are final: a link a teacher has shared must keep
 * working, so renaming a word means accepting the old one too.
 */
export const READING_MODE_PARAM = 'lestur';
const READING_MODE_VALUES: Record<string, ReadingMode> = {
	sidur: 'paged',
	skrun: 'scrolled'
};

/** The mode a `?lestur=` link asks for, or null when it asks for none we know */
export function readingModeFromSearch(search: string): ReadingMode | null {
	const value = new URLSearchParams(search).get(READING_MODE_PARAM);
	return value !== null && Object.hasOwn(READING_MODE_VALUES, value) ? READING_MODE_VALUES[value] : null;
}

/** The mode in effect: a link's for this visit, else the reader's choice, else the unchosen mode */
export function resolveReadingMode(override: ReadingMode | null, chosen: ReadingMode | null): ReadingMode {
	return override ?? chosen ?? UNCHOSEN_READING_MODE;
}

/** Ruling 2: a rollup always scrolls */
export function shouldPage(mode: ReadingMode, type: SectionType | undefined): boolean {
	return mode === 'paged' && !isRollup(type);
}

/**
 * The section wrapper's data-paged-section (plan step S8.4, CODE-17): present while the
 * section is paged and its pager has not failed, from the pager's mount on, so the ← / →
 * section shortcut steps aside for it (keyboardShortcuts.ts); its value is the pager's
 * state, and 'end' lets → go on to the next section. Gone once the pager fails: the
 * section scrolls again and ← / → change section, as in scrolled mode.
 */
export function pagedSectionMark(paged: boolean, state: PagerState): Exclude<PagerState, 'failed'> | undefined {
	return paged && state !== 'failed' ? state : undefined;
}

/** Whether the end-of-section marker detects reading: scrolled, or paged with a failed pager */
export function endMarkerActive(paged: boolean, state: PagerState): boolean {
	return !paged || state === 'failed';
}
