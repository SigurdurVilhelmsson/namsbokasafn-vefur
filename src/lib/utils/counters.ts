/**
 * Local counters (plan step S5.4, register PED-17): how often a prompt was shown, saved,
 * skipped or abandoned, kept as small aggregate counts on the device, never free text.
 *
 * They live in the analytics store (`counters` on AnalyticsState), never in `logActivity`,
 * whose log keeps 500 entries and whose export keeps 100. Keys are a registered book slug
 * and an event from the closed list below, so the stored object stays bounded however
 * many events are recorded, and nothing is keyed by section (no rename migration needed).
 * They leave the device only in the counts export below, which the student starts and
 * previews (D09, plan step S5.5).
 */
import { books } from '$lib/types/book';

/** The closed list of events. A new event is a new entry here, and nothing else. */
export const COUNTER_EVENTS = ['recallShown', 'recallSaved', 'recallSkipped', 'recallAbandoned'] as const;

export type CounterEvent = (typeof COUNTER_EVENTS)[number];

/** Counts per registered book slug, per event */
export type Counters = Record<string, Partial<Record<CounterEvent, number>>>;

export interface RecallTotals {
	shown: number;
	saved: number;
	skipped: number;
	abandoned: number;
}

/** The registered books, retired ones excluded: no route of a retired book is reachable */
const isCountedBook = (slug: string): boolean => books.some((b) => b.slug === slug);

const isCounterEvent = (key: string): key is CounterEvent => (COUNTER_EVENTS as readonly string[]).includes(key);

const isCount = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
	typeof v === 'object' && v !== null && !Array.isArray(v);

/** Add one to a book's event. Returns the same object for a book that is not counted. */
export function incrementCounter(counters: Counters, bookSlug: string, event: CounterEvent): Counters {
	if (!isCountedBook(bookSlug)) return counters;
	const current = counters[bookSlug]?.[event] ?? 0;
	const next = Math.min(current + 1, Number.MAX_SAFE_INTEGER);
	return { ...counters, [bookSlug]: { ...counters[bookSlug], [event]: next } };
}

/**
 * Keep only registered books, known events and whole, non-negative, safe counts. Applied
 * on load and to another tab's write, since the store's validator checks only that
 * `counters` is an object.
 */
export function sanitizeCounters(raw: unknown): Counters {
	if (!isPlainObject(raw)) return {};
	const clean: Counters = {};
	for (const [slug, events] of Object.entries(raw)) {
		if (!isCountedBook(slug) || !isPlainObject(events)) continue;
		const kept: Partial<Record<CounterEvent, number>> = {};
		for (const [event, count] of Object.entries(events)) {
			if (isCounterEvent(event) && isCount(count)) kept[event] = count;
		}
		if (Object.keys(kept).length > 0) clean[slug] = kept;
	}
	return clean;
}

/** The recall counts added up across books, as /greining's other figures are */
export function recallTotals(counters: Counters): RecallTotals {
	const totals: RecallTotals = { shown: 0, saved: 0, skipped: 0, abandoned: 0 };
	for (const events of Object.values(counters)) {
		totals.shown += events.recallShown ?? 0;
		totals.saved += events.recallSaved ?? 0;
		totals.skipped += events.recallSkipped ?? 0;
		totals.abandoned += events.recallAbandoned ?? 0;
	}
	return totals;
}

/** Icelandic takes the singular after a number ending in 1, except 11 (1, 21, 101; not 11, 111) */
const takesSingular = (n: number): boolean => n % 10 === 1 && n % 100 !== 11;

/**
 * /greining's one-line summary, about the student's own use only: no comparison and no
 * reward (KEEP-01). Null until a prompt has been shown.
 */
export function recallSummaryLine(totals: RecallTotals): string | null {
	if (totals.shown === 0) return null;
	const noun = takesSingular(totals.saved) ? 'upprifjun' : 'upprifjanir';
	// The summary on /greining (S5.4, PED-17). It adds up all books, as the page's other figures
	// do ([USER], 2026-11-01).
	return `Þú hefur vistað ${totals.saved} ${noun} og sleppt ${totals.skipped}.`;
}

/**
 * The counts-only export (plan step S5.5, D09): the file 'Flytja út' on /greining offers after
 * the student has seen exactly this text. Counts per book and the day it was made, and nothing
 * else: no recall text, no section, no time of day, no identifier. It is a download only; the
 * student decides whether and to whom to send it.
 */
export function countsExport(counters: Counters, date: string): string {
	const file = { format: 'namsbokasafn-counts', version: 1, date, counts: sanitizeCounters(counters) };
	return JSON.stringify(file, null, 2);
}
