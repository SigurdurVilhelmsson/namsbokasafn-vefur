/**
 * readerPolicy (plan step S5.2, CODE-22, PED-04). The tests pin only what is ruled: the
 * rollup set, call 2's type gate and D10's trigger. 'supplementary' is ruled neither way,
 * so no test pins it.
 */
import { describe, expect, it } from 'vitest';
import type { SectionType } from '$lib/types/content';
import {
	ROLLUP_SECTION_TYPES,
	endOfUnitActivity,
	isFrontMatterChapter,
	isRollup,
	recallTrigger,
	readingModeFromSearch,
	resolveReadingMode,
	shouldPage,
	skippedByStudySession,
	UNCHOSEN_READING_MODE
} from './readerPolicy';

const ROLLUPS: SectionType[] = ['glossary', 'equations', 'summary', 'exercises', 'answer-key'];

describe('the rollup set', () => {
	// Removing any type from the set fails this
	it.each(ROLLUPS)('%s is a rollup', (type) => {
		expect(isRollup(type)).toBe(true);
	});

	it('has exactly the five rollup types', () => {
		expect([...ROLLUP_SECTION_TYPES].sort()).toEqual([...ROLLUPS].sort());
	});

	it.each([['introduction'], [undefined]] as const)('%s is not a rollup', (type) => {
		expect(isRollup(type)).toBe(false);
	});
});

describe("call 2's type gate: where the recall prompt belongs", () => {
	it('a numbered section ends with the prompt', () => {
		expect(endOfUnitActivity(undefined, false)).toBe('recall');
	});

	it.each(ROLLUPS)('a rollup (%s) does not', (type) => {
		expect(endOfUnitActivity(type, false)).toBeNull();
	});

	it('a chapter introduction does not', () => {
		expect(endOfUnitActivity('introduction', false)).toBeNull();
	});

	it('the front matter (Formáli, chapter 00, no type) does not', () => {
		expect([isFrontMatterChapter('00'), endOfUnitActivity(undefined, isFrontMatterChapter('00'))]).toEqual([true, null]);
	});
});

describe("D10's trigger: reaching the section end, once per section", () => {
	it('opens the prompt at the end of a numbered section not prompted yet', () => {
		expect(recallTrigger({ type: undefined, isFrontMatter: false, alreadyPrompted: false })).toBe('section');
	});

	it('does not open it twice for one section', () => {
		expect(recallTrigger({ type: undefined, isFrontMatter: false, alreadyPrompted: true })).toBeNull();
	});

	it('does not open it on a rollup', () => {
		expect(recallTrigger({ type: 'summary', isFrontMatter: false, alreadyPrompted: false })).toBeNull();
	});
});

describe('the study session', () => {
	it.each([...ROLLUPS, 'introduction'] as SectionType[])('skips %s when it looks for unread content', (type) => {
		expect(skippedByStudySession(type)).toBe(true);
	});

	it('keeps a numbered section', () => {
		expect(skippedByStudySession(undefined)).toBe(false);
	});
});

describe('the reading mode (S8.2: D06, PED-01, PED-35, ruling 2)', () => {
	it.each(ROLLUPS)('a rollup (%s) is never paged', (type) => {
		expect(shouldPage('paged', type)).toBe(false);
	});

	// The introduction pin records current behaviour, not a ruling: ruling 2 names only rollups
	it('a numbered section and an introduction are paged in paged mode, and not in scrolled', () => {
		expect([shouldPage('paged', undefined), shouldPage('paged', 'introduction')]).toEqual([true, true]);
		expect([shouldPage('scrolled', undefined), shouldPage('scrolled', 'introduction')]).toEqual([false, false]);
	});

	it('a link wins over a choice, and a choice over the unchosen mode', () => {
		expect(resolveReadingMode('scrolled', 'paged')).toBe('scrolled');
		expect(resolveReadingMode('paged', 'scrolled')).toBe('paged');
		expect(resolveReadingMode(null, 'paged')).toBe('paged');
		expect(resolveReadingMode(null, null)).toBe(UNCHOSEN_READING_MODE);
	});

	it.each([
		['?lestur=sidur', 'paged'],
		['?lestur=skrun', 'scrolled'],
		['?a=1&lestur=sidur', 'paged'],
		['', null],
		['?lestur=', null],
		['?lestur=paged', null],
		['?lestur=Sidur', null],
		['?lestur=constructor', null],
		['?lestur=toString', null]
	] as const)('%j asks for %s', (search, mode) => {
		expect(readingModeFromSearch(search)).toBe(mode);
	});
});
