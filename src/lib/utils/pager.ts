/**
 * The paged reader's decisions as pure functions (plan step S8.1; register CODE-18,
 * CODE-16, KEEP-06). PagedReaderControls (ported in S8.2) measures, hides blocks and
 * listens for keys, swipes and hash changes; what those mean is decided here, where a
 * unit test reaches it. Each rule is v1.1's at dde768e unless its comment says
 * otherwise. Nothing here reads the DOM, the window or a store.
 *
 * Positions: a section is split into units (its sub-sections, and the runs of blocks
 * around them), and each unit into pages. The component keeps one flat list of every
 * page in reading order; `pageCounts[u]` is unit u's number of pages.
 */
import { pageIndexForItem, type PageRange } from './paginate';

/** A page's place: unit `unit`, page `page` within it, both 0-based */
export interface PagePosition {
	unit: number;
	page: number;
}

/** A block's place: unit `unit`, block `item` among the unit's blocks, both 0-based */
export interface ItemPosition {
	unit: number;
	item: number;
}

export type PageTurn = 'next' | 'prev';

// =============================================================================
// THE PAGE BUDGET
// =============================================================================

/**
 * The page-height budget's parts, in px: today's values from dde768e. Call 1 was ruled
 * on 2026-10-23, maximise usable lines (docs/decisions/2026-10-23-reader-call1-page-
 * budget-maximise-usable-lines.md), and S9.5 applies it here, so a new budget is an
 * edit to these constants.
 */
export const PAGE_BUDGET: Readonly<{
	scrollOffset: number;
	bottomClearance: number;
	initialGapBelow: number;
	floor: number;
}> = {
	/** Where a page turn scrolls the top of the content to, below the window's top */
	scrollOffset: 96,
	/** Room kept free under the page controls for what floats in the bottom corners and
	 *  centre: the tools button and timer pill on phones, the timer pill on desktop, the
	 *  focus-mode bar. Each covered 'Næsta' (QA E18). */
	bottomClearance: 76,
	/** The gap between the last block and the bottom of the page controls, until the
	 *  controls exist and are measured */
	initialGapBelow: 150,
	/** The smallest page, however short the window */
	floor: 240
};

/**
 * The height a page may fill, scrolled to the content top: the window's inner height
 * less the scroll offset, the measured chrome above the first block and below the last
 * (`gapAbove`, `gapBelow`) and the bottom clearance, never below the floor.
 */
export function pageBudget({
	innerHeight,
	gapAbove,
	gapBelow
}: {
	innerHeight: number;
	gapAbove: number;
	gapBelow: number;
}): number {
	return Math.max(
		PAGE_BUDGET.floor,
		innerHeight - PAGE_BUDGET.scrollOffset - gapAbove - gapBelow - PAGE_BUDGET.bottomClearance
	);
}

// =============================================================================
// FLAT POSITIONS
// =============================================================================

/** Every page in reading order: the component's flat list */
export function flatPositions(pageCounts: readonly number[]): PagePosition[] {
	return pageCounts.flatMap((count, unit) => Array.from({ length: count }, (_, page) => ({ unit, page })));
}

/** The flat index of a page, or null when the section has no such page */
export function flatIndexOf({ unit, page }: PagePosition, pageCounts: readonly number[]): number | null {
	if (!Number.isInteger(unit) || !Number.isInteger(page) || unit < 0 || page < 0) return null;
	if (unit >= pageCounts.length || page >= pageCounts[unit]) return null;
	let index = page;
	for (let u = 0; u < unit; u++) index += pageCounts[u];
	return index;
}

/** The page at a flat index, or null past either end */
export function positionAt(index: number, pageCounts: readonly number[]): PagePosition | null {
	if (!Number.isInteger(index) || index < 0) return null;
	let rest = index;
	for (let unit = 0; unit < pageCounts.length; unit++) {
		if (rest < pageCounts[unit]) return { unit, page: rest };
		rest -= pageCounts[unit];
	}
	return null;
}

// =============================================================================
// THE PAGE HASH
// =============================================================================

const PAGE_HASH = /^#sub-(\d+)(?:-p-(\d+))?$/;

/**
 * The hash that addresses a page: '#sub-U' for a unit's first page, '#sub-U-p-P' past
 * it, and '' for the section's first page, where the component writes the bare URL
 * (pathname and search) instead. P depends on the window and the font size, so a
 * '-p-P' link can open another page on another device (CODE-16; plan step S11.2
 * writes the page's first block id instead, and keeps reading this form).
 */
export function encodePageHash({ unit, page }: PagePosition): string {
	if (unit === 0 && page === 0) return '';
	return page === 0 ? `#sub-${unit}` : `#sub-${unit}-p-${page}`;
}

/** The page a page hash names, or null for any other hash ('', '#', an element id) */
export function decodePageHash(hash: string): PagePosition | null {
	const match = PAGE_HASH.exec(hash);
	if (!match) return null;
	return { unit: Number(match[1]), page: match[2] === undefined ? 0 : Number(match[2]) };
}

/**
 * The flat index a page hash opens. A page past the end of its unit opens that unit's
 * last page (CODE-16). v1.1 had no page for it: on arrival it opened the section's
 * first page, so '#sub-2-p-10' written on a phone, where unit 2 has 12 pages, sent a
 * tablet reader (7 pages) back to the start, and on a hash change it stayed put.
 *
 * Null for any other hash: the component then tries it as an element deep link
 * (elementForHash, which skips '#sub-<digits>…') and opens the page holding that
 * element. Null too for a unit the section lacks (the content changed): on arrival the
 * component opens the first page, as for a bare URL, and on a hash change it stays on
 * the page shown, as in v1.1.
 */
export function resolvePageHash(hash: string, pageCounts: readonly number[]): number | null {
	const named = decodePageHash(hash);
	if (!named) return null;
	// For a unit the section lacks, the count is 0 and flatIndexOf gives null
	const count = pageCounts[named.unit] ?? 0;
	return flatIndexOf({ unit: named.unit, page: Math.min(named.page, count - 1) }, pageCounts);
}

// =============================================================================
// THE POSITION LABEL
// =============================================================================

/**
 * Where the reader is: the visible label and the live announcement are both this one
 * string, so they cannot disagree again (QA E19, KEEP-04). A unit with no page count
 * reads as one page, as in v1.1.
 */
export function positionLabel({ unit, page }: PagePosition, pageCounts: readonly number[]): string {
	// D20: proposed (S8.1): the pager's position label, 'Hluti N af M · Síða X af Y',
	// as v1.1 wrote it at dde768e; readers see it only through a '?lestur=sidur' link until a
	// reading-mode picker is rendered (D06).
	return `Hluti ${unit + 1} af ${pageCounts.length} · Síða ${page + 1} af ${pageCounts[unit] ?? 1}`;
}

// =============================================================================
// KEYS AND SWIPES
// =============================================================================

/** What the key handler reads off a KeyboardEvent (a KeyboardEvent will do) */
export type PageKey = Pick<
	KeyboardEvent,
	'key' | 'shiftKey' | 'ctrlKey' | 'metaKey' | 'altKey' | 'defaultPrevented'
>;

/**
 * What the component knows about the page when a key arrives. The fields may be
 * getters: keyAction reads them as v1.1 did, `typing` first, `belongsElsewhere` only
 * when not typing, and `focusOnControl` only for Space, so keyBelongsElsewhere() need
 * not run for a key typed into a field.
 */
export interface KeyContext {
	/** Focus is in an <input> of any type (a checkbox too), a textarea, a select or
	 *  editable content: keyboardShortcuts.ts's isTyping(), the global shortcuts' rule too
	 *  (S8.4, CODE-18) */
	typing: boolean;
	/** keyBelongsElsewhere(): an open dialog, a selection being extended with Shift and
	 *  an arrow, or a focused box that scrolls sideways */
	belongsElsewhere: boolean;
	/** Focus is on a control that Space presses: a button, a link, a summary, a
	 *  role="button" ('Fyrri', 'Sýna svar', a glossary term) */
	focusOnControl: boolean;
}

/**
 * The page turn a key asks for, or null when the key is not the pager's. → PageDown
 * and Space turn forward, ← PageUp and Shift+Space back; never with Ctrl, Cmd or Alt.
 * Space on a page taller than the window still turns it: whether it scrolls first is
 * D11's question, deferred to S9.0.
 */
export function keyAction(event: PageKey, context: KeyContext): PageTurn | null {
	if (event.defaultPrevented || context.typing || context.belongsElsewhere) return null;
	if (event.ctrlKey || event.metaKey || event.altKey) return null;
	if (event.key === ' ' && context.focusOnControl) return null;

	if (event.key === 'ArrowRight' || event.key === 'PageDown' || (event.key === ' ' && !event.shiftKey)) {
		return 'next';
	}
	if (event.key === 'ArrowLeft' || event.key === 'PageUp' || (event.key === ' ' && event.shiftKey)) {
		return 'prev';
	}
	return null;
}

/** A swipe turns a page only when it is clearly sideways, in px */
export const SWIPE: Readonly<{ minDistance: number; maxDrift: number }> = {
	/** It must travel further than this sideways */
	minDistance: 60,
	/** and less than this up or down, so vertical gestures stay the browser's */
	maxDrift: 40
};

/** Whether a touch that moved `dx` sideways and `dy` up or down is a page swipe */
export function isPageSwipe(dx: number, dy: number): boolean {
	return Math.abs(dx) > SWIPE.minDistance && Math.abs(dy) < SWIPE.maxDrift;
}

/** The page turn a touch asks for: a swipe to the left turns forward, to the right back */
export function swipeAction(dx: number, dy: number): PageTurn | null {
	if (!isPageSwipe(dx, dy)) return null;
	return dx < 0 ? 'next' : 'prev';
}

// =============================================================================
// STEPS
// =============================================================================

/** What one press of 'Næsta' does */
export interface NextStep {
	/** The flat index to show next, or null to stay */
	index: number | null;
	/** The unit whose last page this press leaves, reported once (the component's
	 *  onsubsectioncomplete); null if none or already reported */
	unitComplete: number | null;
	/** This press finishes the section; at most once */
	sectionComplete: boolean;
}

/**
 * 'Næsta' from flat index `current`. Leaving a unit's last page completes that unit,
 * once. On the section's last page it finishes the section, once, even when the reader
 * skipped units by coming in through a link to a later one: it used to need every unit
 * paged through, which left that reader a 'Næsta' that did nothing and no recall prompt
 * ([USER], 2026-10-04, ruling 3). `done` is what has already fired.
 */
export function stepNext(
	current: number,
	pageCounts: readonly number[],
	done: { section: boolean; units: ReadonlySet<number> }
): NextStep {
	const at = positionAt(current, pageCounts);
	if (!at) return { index: null, unitComplete: null, sectionComplete: false };
	const leavesUnit = at.page === pageCounts[at.unit] - 1 && !done.units.has(at.unit);
	const hasNext = positionAt(current + 1, pageCounts) !== null;
	return {
		index: hasNext ? current + 1 : null,
		unitComplete: leavesUnit ? at.unit : null,
		sectionComplete: !hasNext && !done.section
	};
}

/** 'Fyrri' from flat index `current`: the page before, or null on the first page and
 *  from a page the section lacks */
export function stepPrev(current: number, pageCounts: readonly number[]): number | null {
	return current > 0 && positionAt(current, pageCounts) !== null ? current - 1 : null;
}

// =============================================================================
// RE-SPLITS
// =============================================================================

/** The block a re-split keeps on screen: the first block of the page shown now */
export function pageAnchor(
	shown: PagePosition | null | undefined,
	pages: readonly (readonly PageRange[])[]
): ItemPosition | null {
	if (!shown) return null;
	const range = pages[shown.unit]?.[shown.page];
	return range ? { unit: shown.unit, item: range.start } : null;
}

/**
 * The flat index of the page holding a block, or null when its unit does not exist or
 * the block is not a block index (itemIndexForTarget's -1, 'not found'). A block past
 * the end of its unit counts as on the unit's last page (pageIndexForItem).
 */
export function flatIndexForItem(
	at: ItemPosition,
	pages: readonly (readonly PageRange[])[]
): number | null {
	if (!Number.isInteger(at.unit) || at.unit < 0 || at.unit >= pages.length) return null;
	if (!Number.isInteger(at.item) || at.item < 0) return null;
	const page = pageIndexForItem(pages[at.unit], at.item);
	return flatIndexOf(
		{ unit: at.unit, page },
		pages.map((unit) => unit.length)
	);
}

/**
 * The page to show after a re-split (a font-size change, a resize, a late image): the
 * page holding the deep-link target, when the reader was sent to one and it is still
 * in the section, since a late image can push the target onto the next page (QA E8);
 * else the page holding `anchor`, the block that opened the page shown before, which
 * keeps the reader within a page of where they were; else the first page.
 */
export function pageAfterResplit(
	{ target, anchor }: { target: ItemPosition | null; anchor: ItemPosition | null },
	pages: readonly (readonly PageRange[])[]
): number {
	const fromTarget = target ? flatIndexForItem(target, pages) : null;
	if (fromTarget !== null) return fromTarget;
	const fromAnchor = anchor ? flatIndexForItem(anchor, pages) : null;
	return fromAnchor ?? 0;
}

/**
 * What the pager tells the section page, which keys ← / → and the end marker on it:
 * 'pending' from mount until its keys are live (fonts, images, the first split);
 * 'ready' while it turns pages; 'end' on the last page once 'Næsta' has finished the
 * section (the same test that disables 'Næsta'); 'failed' once it has given the section
 * back to scrolling. A pager its owner destroyed reports nothing more.
 */
export type PagerState = 'pending' | 'ready' | 'end' | 'failed';

export function pagerState(s: {
	failed: boolean;
	live: boolean;
	current: number;
	pages: number;
	sectionComplete: boolean;
}): PagerState {
	if (s.failed) return 'failed';
	if (!s.live) return 'pending';
	return s.sectionComplete && s.current === s.pages - 1 ? 'end' : 'ready';
}
