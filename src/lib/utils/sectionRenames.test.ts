import { describe, it, expect } from 'vitest';
import type { TableOfContents } from '$lib/types/content';
import type { SectionRedirect } from '$lib/data/sectionRedirects';
import {
	resolveActiveRenames,
	renameInReader,
	renameInAnnotations,
	renameInAnalytics,
	renameInObjectives,
	renameInPracticeProblems,
	type SectionRename
} from './sectionRenames';

const B = 'efnafraedi-2e';
const row = (fromSlug: string, toSlug: string, ch = '10', toCh = ch): SectionRedirect => ({
	bookSlug: B,
	fromChapter: ch,
	fromSlug,
	toChapter: toCh,
	toSlug,
	moduleId: 'm1'
});
const toc = (files: string[]) =>
	({ chapters: [{ number: 10, sections: files.map((f) => ({ file: `${f}.html` })) }] }) as unknown as TableOfContents;

// One active rename (target published) used by the transform tests
const R: SectionRename[] = [{ bookSlug: B, fromChapter: '10', fromSlug: 'old', toChapter: '10', toSlug: 'new' }];
const OLD = `${B}/10/old`;
const NEW = `${B}/10/new`;

describe('resolveActiveRenames', () => {
	it('applies a row whose target is published and skips one whose target is not', () => {
		const rows = [row('old', 'new'), row('phys-old', 'phys-new')];
		expect(resolveActiveRenames(B, toc(['new', 'phys-old']), rows)).toEqual([
			{ bookSlug: B, fromChapter: '10', fromSlug: 'old', toChapter: '10', toSlug: 'new' }
		]);
	});

	// A→B, then B renamed again to C: A must reach C, not strand on B
	it('follows a chain to its published final target', () => {
		const rows = [row('a', 'b'), row('b', 'c')];
		const renames = resolveActiveRenames(B, toc(['c']), rows);
		expect(renames.map((r) => `${r.fromSlug}->${r.toSlug}`).sort()).toEqual(['a->c', 'b->c']);
	});

	// The route redirects one hop (A→B when B is published), so the migration
	// must stop at the last PUBLISHED hop, not skip A because C is not out yet
	it('stops at the last published hop of a chain', () => {
		const rows = [row('a', 'b'), row('b', 'c')];
		expect(resolveActiveRenames(B, toc(['b']), rows)).toEqual([
			{ bookSlug: B, fromChapter: '10', fromSlug: 'a', toChapter: '10', toSlug: 'b' }
		]);
	});

	it('survives a cycle', () => {
		const rows = [row('a', 'b'), row('b', 'a')];
		expect(resolveActiveRenames(B, toc(['a', 'b']), rows)).toEqual([]);
	});

	it('ignores another book', () => {
		expect(resolveActiveRenames('liffraedi-2e', toc(['new']), [row('old', 'new')])).toEqual([]);
	});
});

describe('renameInReader', () => {
	const base = { progress: {}, scrollPositions: {}, bookmarks: [] as unknown[], currentChapter: null, currentSection: null };

	it('moves a read mark and deletes the old key', () => {
		const s = renameInReader({ ...base, progress: { [OLD]: { read: true, lastVisited: '2026-08-01T00:00:00.000Z' } } }, R);
		expect(s.progress).toEqual({ [NEW]: { read: true, lastVisited: '2026-08-01T00:00:00.000Z' } });
	});

	// The new page's first visit creates {read:false}: the old read mark must win
	it('merges read marks (OR) and keeps the later visit', () => {
		const s = renameInReader(
			{
				...base,
				progress: {
					[OLD]: { read: true, lastVisited: '2026-08-01T00:00:00.000Z' },
					[NEW]: { read: false, lastVisited: '2026-10-04T00:00:00.000Z' }
				}
			},
			R
		);
		expect(s.progress).toEqual({ [NEW]: { read: true, lastVisited: '2026-10-04T00:00:00.000Z' } });
	});

	it('keeps the newer scroll position', () => {
		const s = renameInReader(
			{
				...base,
				scrollPositions: {
					[OLD]: { scrollY: 900, percentage: 50, timestamp: '2026-10-05T00:00:00.000Z' },
					[NEW]: { scrollY: 10, percentage: 6, timestamp: '2026-10-04T00:00:00.000Z' }
				}
			},
			R
		);
		expect(s.scrollPositions).toEqual({ [NEW]: { scrollY: 900, percentage: 50, timestamp: '2026-10-05T00:00:00.000Z' } });
	});

	it('renames a bookmark and drops the duplicate', () => {
		const s = renameInReader({ ...base, bookmarks: [OLD, `${B}/01/x`, NEW] }, R);
		expect(s.bookmarks).toEqual([NEW, `${B}/01/x`]);
	});

	it('is idempotent and returns the same object when nothing matches', () => {
		const once = renameInReader({ ...base, progress: { [OLD]: { read: true, lastVisited: 'x' } } }, R);
		expect(renameInReader(once, R)).toBe(once);
		const untouched = { ...base, progress: { [`${B}/01/x`]: { read: true, lastVisited: 'x' } } };
		expect(renameInReader(untouched, R)).toBe(untouched);
	});
});

describe('renameInAnnotations', () => {
	it('moves matching highlights and leaves others as they were', () => {
		const a = { id: '1', bookSlug: B, chapterSlug: '10', sectionSlug: 'old', updatedAt: 't' };
		const b = { id: '2', bookSlug: B, chapterSlug: '10', sectionSlug: 'other', updatedAt: 't' };
		const out = renameInAnnotations([a, b], R);
		expect(out[0]).toEqual({ ...a, sectionSlug: 'new' });
		expect(out[1]).toBe(b);
		expect(renameInAnnotations(out, R)).toBe(out);
	});
});

describe('renameInAnalytics', () => {
	it('adds up reading time under both names', () => {
		const s = renameInAnalytics(
			{
				sectionReadingTimes: {
					[OLD]: { totalSeconds: 300, sessionCount: 2, lastRead: '2026-08-01', averageSessionSeconds: 150 },
					[NEW]: { totalSeconds: 100, sessionCount: 2, lastRead: '2026-10-04', averageSessionSeconds: 50 }
				},
				activityLog: [],
				sessions: []
			},
			R
		);
		expect(s.sectionReadingTimes).toEqual({
			[NEW]: { totalSeconds: 400, sessionCount: 4, lastRead: '2026-10-04', averageSessionSeconds: 100 }
		});
	});

	it('rewrites the activity log entries readers see on /greining', () => {
		const s = renameInAnalytics(
			{
				sectionReadingTimes: {},
				activityLog: [{ id: 'a', details: { bookSlug: B, chapterSlug: '10', sectionSlug: 'old', action: 'started' } }],
				sessions: [{ sectionKey: OLD, bookSlug: B, chapterSlug: '10', sectionSlug: 'old' }]
			},
			R
		);
		expect(s.activityLog[0].details).toEqual({ bookSlug: B, chapterSlug: '10', sectionSlug: 'new', action: 'started' });
		expect(s.sessions[0]).toEqual({ sectionKey: NEW, bookSlug: B, chapterSlug: '10', sectionSlug: 'new' });
		expect(renameInAnalytics(s, R)).toBe(s);
	});
});

describe('renameInObjectives', () => {
	const obj = (slug: string, i: number, extra = {}) => ({
		chapterSlug: '10',
		sectionSlug: slug,
		objectiveIndex: i,
		objectiveText: `${slug} ${i}`,
		isCompleted: false,
		...extra
	});

	it('moves keys and fields together, merging a tick with a later rating', () => {
		const out = renameInObjectives(
			{
				[`${OLD}/0`]: obj('old', 0, { isCompleted: true, completedAt: '2026-08-01' }),
				[`${NEW}/0`]: obj('new', 0, { confidence: 'confident', assessedAt: '2026-10-04' }),
				[`${OLD}/1`]: obj('old', 1)
			},
			R
		);
		expect(Object.keys(out).sort()).toEqual([`${NEW}/0`, `${NEW}/1`]);
		expect(out[`${NEW}/0`]).toMatchObject({
			sectionSlug: 'new',
			isCompleted: true,
			completedAt: '2026-08-01',
			confidence: 'confident',
			objectiveText: 'new 0'
		});
		expect(out[`${NEW}/1`]).toMatchObject({ chapterSlug: '10', sectionSlug: 'new', objectiveIndex: 1 });
	});

	// /markmid keys its list by (chapterSlug, sectionSlug, objectiveIndex): a
	// duplicate crashes its keyed {#each}
	it('never leaves two records with the same identity', () => {
		const out = renameInObjectives(
			{ [`${OLD}/0`]: obj('old', 0, { isCompleted: true }), [`${NEW}/0`]: obj('new', 0) },
			R
		);
		const ids = Object.values(out).map((o) => `${o.chapterSlug}-${o.sectionSlug}-${o.objectiveIndex}`);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('does not touch a longer sibling slug, and is idempotent', () => {
		const input = { [`${B}/10/old-extra/0`]: obj('old-extra', 0) };
		expect(renameInObjectives(input, R)).toBe(input);
		const once = renameInObjectives({ [`${OLD}/0`]: obj('old', 0) }, R);
		expect(renameInObjectives(once, R)).toBe(once);
	});
});

describe('renameInPracticeProblems', () => {
	const p = (key: string, extra = {}) => ({
		id: key,
		chapterSlug: '10',
		sectionSlug: key.includes('/old#') ? 'old' : 'new',
		isCompleted: false,
		attempts: 0,
		successfulAttempts: 0,
		...extra
	});

	it('adds up attempts and keeps id equal to the key', () => {
		const out = renameInPracticeProblems(
			{
				[`${OLD}#fs-1`]: p(`${OLD}#fs-1`, { attempts: 3, successfulAttempts: 2, isCompleted: true, lastAttempted: '2026-08-01' }),
				[`${NEW}#fs-1`]: p(`${NEW}#fs-1`, { attempts: 1, successfulAttempts: 0, lastAttempted: '2026-10-04' }),
				[`${OLD}#fs-2`]: p(`${OLD}#fs-2`, { attempts: 1 })
			},
			R
		);
		expect(Object.keys(out).sort()).toEqual([`${NEW}#fs-1`, `${NEW}#fs-2`]);
		expect(out[`${NEW}#fs-1`]).toMatchObject({ attempts: 4, successfulAttempts: 2, isCompleted: true, lastAttempted: '2026-10-04' });
		for (const [key, rec] of Object.entries(out)) expect(rec.id).toBe(key);
		expect(out[`${NEW}#fs-2`]).toMatchObject({ sectionSlug: 'new', attempts: 1 });
		expect(renameInPracticeProblems(out, R)).toBe(out);
	});
});

// One malformed persisted entry must not throw: before, it aborted the
// migration of every store after it, on every table-of-contents load
describe('malformed persisted entries', () => {
	it('skips null highlights and still moves the good ones', () => {
		const good = { id: '1', bookSlug: B, chapterSlug: '10', sectionSlug: 'old' };
		const out = renameInAnnotations([null, good] as never, R);
		expect(out[0]).toBeNull();
		expect(out[1]).toMatchObject({ sectionSlug: 'new' });
	});

	it('keeps the good side when one side of a merge is not a record', () => {
		const p = { id: `${NEW}#a`, chapterSlug: '10', sectionSlug: 'new', isCompleted: false, attempts: 2, successfulAttempts: 1 };
		const out = renameInPracticeProblems({ [`${OLD}#a`]: null, [`${NEW}#a`]: p } as never, R);
		expect(out[`${NEW}#a`]).toMatchObject({ attempts: 2, id: `${NEW}#a` });
		const objs = renameInObjectives(
			{ [`${OLD}/0`]: null, [`${NEW}/0`]: { chapterSlug: '10', sectionSlug: 'new', objectiveIndex: 0, objectiveText: 't', isCompleted: true } } as never,
			R
		);
		expect(objs[`${NEW}/0`]).toMatchObject({ isCompleted: true, sectionSlug: 'new' });
		const times = renameInAnalytics(
			{ sectionReadingTimes: { [OLD]: null, [NEW]: { totalSeconds: 5, sessionCount: 1, lastRead: 'x', averageSessionSeconds: 5 } } as never, activityLog: [null] as never, sessions: [null] as never },
			R
		);
		expect(times.sectionReadingTimes[NEW]).toMatchObject({ totalSeconds: 5 });
	});
});

