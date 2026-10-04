/**
 * Carry a reader's saved state across a renamed section.
 *
 * A title correction renames a section's file, which renames its URL
 * (sectionRedirects.ts). Reader state is keyed by that URL, so without this
 * the reader's read marks, bookmarks, highlights, ticked objectives, practice
 * attempts and reading times stay under the old slug and silently vanish from
 * the renamed page.
 *
 * 🔴 Only ACTIVE renames are applied: those whose final target is published in
 * the book's table of contents, the same gate the section route uses before it
 * redirects (exactSectionExists). An inert row's OLD page is still the live
 * one (the four physics ch04 rows, 2026-10): moving its data would make a
 * reader's ticks and read marks vanish from the page they are reading. That is
 * why this runs when a table of contents loads, not when the stores boot.
 *
 * Every transform is pure and idempotent, and returns the SAME object when
 * nothing matched, so a store saves only when something moved. Running it on
 * every table-of-contents load also repairs data a stale tab writes back.
 */

import type { TableOfContents } from '$lib/types/content';
import { SECTION_REDIRECTS, exactSectionExists, type SectionRedirect } from '$lib/data/sectionRedirects';

export interface SectionRename {
	bookSlug: string;
	fromChapter: string;
	fromSlug: string;
	toChapter: string;
	toSlug: string;
}

/**
 * The renames to apply for one book. Each row follows its chain (A→B→C) and
 * targets the LAST PUBLISHED hop: C once C is out, B while only B is. That
 * matches the route, which redirects one hop at a time and only to a published
 * target. Row-by-row checking alone would strand A once B is itself renamed,
 * which is exactly what a second title correction does.
 */
export function resolveActiveRenames(
	bookSlug: string,
	toc: TableOfContents,
	rows: SectionRedirect[] = SECTION_REDIRECTS
): SectionRename[] {
	const forBook = rows.filter((r) => r.bookSlug === bookSlug);
	const next = (chapter: string, slug: string) =>
		forBook.find((r) => r.fromChapter === chapter && r.fromSlug === slug);

	const renames: SectionRename[] = [];
	for (const row of forBook) {
		let toChapter = row.toChapter;
		let toSlug = row.toSlug;
		let target = exactSectionExists(toc, toChapter, toSlug) ? { toChapter, toSlug } : null;
		const seen = new Set([`${row.fromChapter}/${row.fromSlug}`]);
		for (let hop = next(toChapter, toSlug); hop; hop = next(toChapter, toSlug)) {
			const key = `${hop.fromChapter}/${hop.fromSlug}`;
			if (seen.has(key)) break; // cycle guard
			seen.add(key);
			toChapter = hop.toChapter;
			toSlug = hop.toSlug;
			if (exactSectionExists(toc, toChapter, toSlug)) target = { toChapter, toSlug };
		}
		if (!target) continue;
		if (target.toChapter === row.fromChapter && target.toSlug === row.fromSlug) continue;
		renames.push({ bookSlug, fromChapter: row.fromChapter, fromSlug: row.fromSlug, ...target });
	}
	return renames;
}

const sectionKey = (book: string, chapter: string, slug: string) => `${book}/${chapter}/${slug}`;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
/** Later of two ISO timestamps (lexical order is chronological); either may be missing. */
const later = (a?: unknown, b?: unknown) =>
	typeof a !== 'string' ? b : typeof b !== 'string' ? a : a > b ? a : b;

/**
 * Move `record[from]` to `record[to]`, merging when both exist. Returns the
 * same record when `from` is absent. Persisted records are not validated, so a
 * side that is not an object is treated as absent rather than merged.
 */
function moveKey<T>(
	record: Record<string, T>,
	from: string,
	to: string,
	merge: (old: T, current: T) => T
): Record<string, T> {
	if (!(from in record)) return record;
	const next = { ...record };
	const old = next[from];
	delete next[from];
	const cur = record[to];
	next[to] = !(to in record) || !isObj(cur) ? old : !isObj(old) ? cur : merge(old, cur);
	return next;
}

// ---------------------------------------------------------------------------
// Reader: read marks, scroll positions, bookmarks (namsbokasafn:reader)
// ---------------------------------------------------------------------------

interface ReaderLike {
	progress: Record<string, unknown>;
	scrollPositions: Record<string, unknown>;
	bookmarks: unknown[];
	currentChapter: string | null;
	currentSection: string | null;
}

export function renameInReader<S extends ReaderLike>(state: S, renames: SectionRename[]): S {
	let progress = state.progress;
	let scrollPositions = state.scrollPositions;
	let bookmarks = state.bookmarks;
	let { currentChapter, currentSection } = state;

	for (const r of renames) {
		const from = sectionKey(r.bookSlug, r.fromChapter, r.fromSlug);
		const to = sectionKey(r.bookSlug, r.toChapter, r.toSlug);

		// Never keep both: chapter progress counts every key of the chapter, so a
		// read mark under both slugs counted one section twice (over 100%).
		progress = moveKey(progress, from, to, (old, cur) => {
			if (!isObj(old) || typeof old.read !== 'boolean') return cur;
			if (!isObj(cur) || typeof cur.read !== 'boolean') return old;
			return { read: old.read || cur.read, lastVisited: later(old.lastVisited, cur.lastVisited) };
		});
		scrollPositions = moveKey(scrollPositions, from, to, (old, cur) =>
			isObj(old) && isObj(cur) && later(old.timestamp, cur.timestamp) === old.timestamp ? old : cur
		);
		if (bookmarks.includes(from)) {
			const seen = new Set<unknown>();
			bookmarks = bookmarks
				.map((b) => (b === from ? to : b))
				.filter((b) => (typeof b !== 'string' ? true : seen.has(b) ? false : (seen.add(b), true)));
		}
		if (currentChapter === r.fromChapter && currentSection === r.fromSlug) {
			currentChapter = r.toChapter;
			currentSection = r.toSlug;
		}
	}

	const changed =
		progress !== state.progress ||
		scrollPositions !== state.scrollPositions ||
		bookmarks !== state.bookmarks ||
		currentChapter !== state.currentChapter ||
		currentSection !== state.currentSection;
	return changed
		? { ...state, progress, scrollPositions, bookmarks, currentChapter, currentSection }
		: state;
}

// ---------------------------------------------------------------------------
// Annotations: highlights and notes (namsbokasafn:annotations)
// ---------------------------------------------------------------------------

interface AnnotationLike {
	bookSlug: string;
	chapterSlug: string;
	sectionSlug: string;
}

/** Rewrites the section of each matching highlight. Ids are random, so nothing collides. */
export function renameInAnnotations<A extends AnnotationLike>(list: A[], renames: SectionRename[]): A[] {
	let changed = false;
	const next = list.map((a) => {
		if (!isObj(a)) return a;
		const r = renames.find(
			(r) => a.bookSlug === r.bookSlug && a.chapterSlug === r.fromChapter && a.sectionSlug === r.fromSlug
		);
		if (!r) return a;
		changed = true;
		// updatedAt is left alone: the reader did not edit the highlight
		return { ...a, chapterSlug: r.toChapter, sectionSlug: r.toSlug };
	});
	return changed ? next : list;
}

// ---------------------------------------------------------------------------
// Analytics: reading times, activity log, sessions (namsbokasafn:analytics)
// ---------------------------------------------------------------------------

interface ReadingTimeLike {
	totalSeconds: number;
	sessionCount: number;
	lastRead: string;
	averageSessionSeconds: number;
}

interface AnalyticsLike {
	sectionReadingTimes: Record<string, ReadingTimeLike>;
	activityLog: { details?: { bookSlug?: string; chapterSlug?: string; sectionSlug?: string } }[];
	sessions: { sectionKey?: string; bookSlug?: string; chapterSlug?: string; sectionSlug?: string }[];
}

export function renameInAnalytics<S extends AnalyticsLike>(state: S, renames: SectionRename[]): S {
	let times = state.sectionReadingTimes;
	let activityLog = state.activityLog;
	let sessions = state.sessions;

	for (const r of renames) {
		const from = sectionKey(r.bookSlug, r.fromChapter, r.fromSlug);
		const to = sectionKey(r.bookSlug, r.toChapter, r.toSlug);

		// Both keys mean time spent on one section under two names: add them up
		times = moveKey(times, from, to, (old, cur) => {
			const totalSeconds = (old.totalSeconds || 0) + (cur.totalSeconds || 0);
			const sessionCount = (old.sessionCount || 0) + (cur.sessionCount || 0);
			return {
				totalSeconds,
				sessionCount,
				lastRead: (later(old.lastRead, cur.lastRead) as string) ?? '',
				averageSessionSeconds: sessionCount ? Math.round(totalSeconds / sessionCount) : 0
			};
		});

		const matches = (d?: { bookSlug?: string; chapterSlug?: string; sectionSlug?: string } | null) =>
			isObj(d) && d.bookSlug === r.bookSlug && d.chapterSlug === r.fromChapter && d.sectionSlug === r.fromSlug;
		const entryMatches = (e: { details?: unknown } | null) => isObj(e) && matches(e.details as never);
		const sessionMatches = (s: AnalyticsLike['sessions'][number] | null) =>
			isObj(s) && (s.sectionKey === from || matches(s));
		if (activityLog.some(entryMatches)) {
			activityLog = activityLog.map((e) =>
				entryMatches(e)
					? { ...e, details: { ...e.details, chapterSlug: r.toChapter, sectionSlug: r.toSlug } }
					: e
			);
		}
		if (sessions.some(sessionMatches)) {
			sessions = sessions.map((s) =>
				sessionMatches(s)
					? { ...s, sectionKey: to, chapterSlug: r.toChapter, sectionSlug: r.toSlug }
					: s
			);
		}
	}

	return times !== state.sectionReadingTimes ||
		activityLog !== state.activityLog ||
		sessions !== state.sessions
		? { ...state, sectionReadingTimes: times, activityLog, sessions }
		: state;
}

// ---------------------------------------------------------------------------
// Objectives: ticks and confidence ratings (namsbokasafn:objectives)
// ---------------------------------------------------------------------------

interface ObjectiveLike {
	chapterSlug: string;
	sectionSlug: string;
	objectiveIndex: number;
	objectiveText: string;
	isCompleted: boolean;
	completedAt?: string;
	/** A ConfidenceLevel in the store; only copied here */
	confidence?: unknown;
	assessedAt?: string;
}

/**
 * Keys are `book/chapter/slug/<index>`, and each record repeats chapter and
 * slug. Both must move together: /markmid keys its list by the FIELDS, and two
 * records with equal fields crash its keyed {#each}. Note: objectiveIndex is
 * positional, so a re-render that also reorders objectives is not repaired here.
 */
export function renameInObjectives<O extends ObjectiveLike>(
	record: Record<string, O>,
	renames: SectionRename[]
): Record<string, O> {
	let next = record;
	for (const r of renames) {
		const prefix = `${sectionKey(r.bookSlug, r.fromChapter, r.fromSlug)}/`;
		for (const key of Object.keys(next)) {
			const index = key.startsWith(prefix) ? key.slice(prefix.length) : null;
			if (index === null || !/^\d+$/.test(index)) continue;
			const to = `${sectionKey(r.bookSlug, r.toChapter, r.toSlug)}/${index}`;
			next = moveKey(next, key, to, (old, cur) => {
				const rated = later(old.assessedAt, cur.assessedAt) === old.assessedAt && old.assessedAt ? old : cur;
				return {
					...cur, // the corrected page's objective text
					isCompleted: old.isCompleted || cur.isCompleted,
					completedAt: cur.isCompleted ? cur.completedAt : old.completedAt,
					confidence: rated.confidence,
					assessedAt: rated.assessedAt
				} as O;
			});
			if (isObj(next[to])) {
				next = { ...next, [to]: { ...next[to], chapterSlug: r.toChapter, sectionSlug: r.toSlug } };
			}
		}
	}
	return next;
}

// ---------------------------------------------------------------------------
// Practice problems: attempts (namsbokasafn:quiz, practiceProblemProgress)
// ---------------------------------------------------------------------------

interface ProblemLike {
	id: string;
	chapterSlug: string;
	sectionSlug: string;
	isCompleted: boolean;
	attempts: number;
	successfulAttempts: number;
	lastAttempted?: string;
}

/**
 * Keys are `book/chapter/slug#<answer id>`, and each record's `id` must equal
 * its key: the study views record attempts by `id`, and an attempt on a stale
 * id is silently dropped.
 */
export function renameInPracticeProblems<P extends ProblemLike>(
	record: Record<string, P>,
	renames: SectionRename[]
): Record<string, P> {
	let next = record;
	for (const r of renames) {
		const prefix = `${sectionKey(r.bookSlug, r.fromChapter, r.fromSlug)}#`;
		for (const key of Object.keys(next)) {
			if (!key.startsWith(prefix)) continue;
			const to = `${sectionKey(r.bookSlug, r.toChapter, r.toSlug)}#${key.slice(prefix.length)}`;
			next = moveKey(next, key, to, (old, cur) => ({
				...cur,
				attempts: (old.attempts || 0) + (cur.attempts || 0),
				successfulAttempts: (old.successfulAttempts || 0) + (cur.successfulAttempts || 0),
				isCompleted: old.isCompleted || cur.isCompleted,
				lastAttempted: later(old.lastAttempted, cur.lastAttempted) as string | undefined
			}));
			if (isObj(next[to])) {
				next = {
					...next,
					[to]: { ...next[to], id: to, chapterSlug: r.toChapter, sectionSlug: r.toSlug }
				};
			}
		}
	}
	return next;
}
