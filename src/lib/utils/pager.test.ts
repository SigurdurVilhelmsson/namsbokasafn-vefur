/**
 * Tests for the paged reader's pure decisions (plan step S8.1; register CODE-18, CODE-16)
 */

import { describe, it, expect } from 'vitest';
import type { PageRange } from './paginate';
import {
	PAGE_BUDGET,
	CALL1_STEP,
	pageBudget,
	pageHeights,
	flatPositions,
	flatIndexOf,
	positionAt,
	encodePageHash,
	decodePageHash,
	resolvePageHash,
	positionLabel,
	spokenPosition,
	firstInView,
	keyAction,
	KEY_SCROLL,
	keyScroll,
	SWIPE,
	isPageSwipe,
	swipeAction,
	stepNext,
	stepPrev,
	pageAnchor,
	flatIndexForItem,
	pageAfterResplit,
	type KeyContext,
	type PageKey,
	type TouchContext,
	pagerState
} from './pager';

// Three units of 3, 4 and 7 pages: flat indexes 0-2, 3-6 and 7-13
const COUNTS = [3, 4, 7];

// S9.4 (UI-09): the machine-translation notice stands above the section's first page only.
// Measured with every block shown, the chrome above the first block includes it; the other
// pages get that chrome without it, the first page all of it.
describe('pageHeights', () => {
	const at = { innerHeight: 800, gapWithLead: 200, leadInset: 120, gapBelow: 100 };

	it('budgets every page but the first without the notice', () => {
		expect(pageHeights(at).page).toBe(pageBudget({ innerHeight: 800, gapAbove: 80, gapBelow: 100 }));
	});

	it('budgets the first page with it', () => {
		expect(pageHeights(at).firstPage).toBe(pageBudget({ innerHeight: 800, gapAbove: 200, gapBelow: 100 }));
	});

	it('gives the first page the notice’s height less than the rest', () => {
		const { page, firstPage } = pageHeights(at);
		expect(page - firstPage).toBe(120);
	});

	it('budgets every page alike with no notice', () => {
		const { page, firstPage } = pageHeights({ ...at, leadInset: 0 });
		expect(firstPage).toBe(page);
		expect(page).toBe(pageBudget({ innerHeight: 800, gapAbove: 200, gapBelow: 100 }));
	});
});

describe('pageBudget', () => {
	// Call 1's ruled values (S9.5): step 1 measures the content top under the header
	// (headerGap; the fixed 96 is only the fallback), and step 2, with the floating chrome
	// docked in the pager's bar, drops the 76 px clearance. The formula tests below stay
	// computed from the constants.
	it("holds call 1's values, at step 2", () => {
		expect(CALL1_STEP).toBe(2);
		expect(PAGE_BUDGET).toEqual({
			scrollOffset: 96,
			bottomClearance: 0,
			initialGapBelow: 150,
			floor: 240,
			headerGap: 8
		});
	});

	// v1.1 keeps the gap below in a variable it re-measures (calibrate()); the
	// constants are typed as numbers so that compiles (svelte-check reads this file)
	it('seeds a variable the component re-measures', () => {
		let gapBelow = PAGE_BUDGET.initialGapBelow;
		expect(gapBelow).toBeGreaterThan(0);
		gapBelow = 132;
		expect(gapBelow).toBe(132);
	});

	// Expected values come from the constants, never a literal: call 1's ruling
	// changes the constants (S9.5), and these tests must hold either way
	it('is the window less the offset, the measured gaps and the clearance', () => {
		const gaps = { gapAbove: 37, gapBelow: 112 };
		const innerHeight = 1200;
		expect(pageBudget({ innerHeight, ...gaps })).toBe(
			innerHeight - PAGE_BUDGET.scrollOffset - gaps.gapAbove - gaps.gapBelow - PAGE_BUDGET.bottomClearance
		);
	});

	// S9.5 (UI-08's trim (i), call 1's step 1): a turn parks the content top just under the
	// sticky header, measured, not at a fixed 96 px that left about 40 px blank under it
	it('takes the measured content top in place of the fixed offset', () => {
		const at = { innerHeight: 1000, gapAbove: 40, gapBelow: 100 };
		expect(pageBudget({ ...at, scrollOffset: 64 })).toBe(pageBudget(at) + PAGE_BUDGET.scrollOffset - 64);
	});

	it('passes the measured content top through pageHeights', () => {
		const at = { innerHeight: 1000, gapWithLead: 140, leadInset: 100, gapBelow: 100, scrollOffset: 64 };
		expect(pageHeights(at).page).toBe(pageBudget({ innerHeight: 1000, gapAbove: 40, gapBelow: 100, scrollOffset: 64 }));
	});

	it('counts each gap once', () => {
		const base = pageBudget({ innerHeight: 1500, gapAbove: 0, gapBelow: 0 });
		expect(pageBudget({ innerHeight: 1500, gapAbove: 10, gapBelow: 0 })).toBe(base - 10);
		expect(pageBudget({ innerHeight: 1500, gapAbove: 0, gapBelow: 10 })).toBe(base - 10);
		expect(pageBudget({ innerHeight: 1510, gapAbove: 0, gapBelow: 0 })).toBe(base + 10);
	});

	it('never goes below the floor', () => {
		expect(pageBudget({ innerHeight: 300, gapAbove: 50, gapBelow: PAGE_BUDGET.initialGapBelow })).toBe(
			PAGE_BUDGET.floor
		);
		// The window at which the formula meets the floor, and one px either side
		const meets = PAGE_BUDGET.floor + PAGE_BUDGET.scrollOffset + PAGE_BUDGET.bottomClearance;
		expect(pageBudget({ innerHeight: meets, gapAbove: 0, gapBelow: 0 })).toBe(PAGE_BUDGET.floor);
		expect(pageBudget({ innerHeight: meets - 1, gapAbove: 0, gapBelow: 0 })).toBe(PAGE_BUDGET.floor);
		expect(pageBudget({ innerHeight: meets + 1, gapAbove: 0, gapBelow: 0 })).toBe(PAGE_BUDGET.floor + 1);
	});
});

describe('flat positions', () => {
	it('lists every page in reading order', () => {
		expect(flatPositions([2, 1, 3])).toEqual([
			{ unit: 0, page: 0 },
			{ unit: 0, page: 1 },
			{ unit: 1, page: 0 },
			{ unit: 2, page: 0 },
			{ unit: 2, page: 1 },
			{ unit: 2, page: 2 }
		]);
		expect(flatPositions([])).toEqual([]);
	});

	it('finds the flat index of a page', () => {
		expect(flatIndexOf({ unit: 0, page: 0 }, COUNTS)).toBe(0);
		expect(flatIndexOf({ unit: 0, page: 2 }, COUNTS)).toBe(2);
		expect(flatIndexOf({ unit: 1, page: 0 }, COUNTS)).toBe(3);
		expect(flatIndexOf({ unit: 2, page: 6 }, COUNTS)).toBe(13);
	});

	it('has no flat index for a page the section lacks', () => {
		for (const missing of [
			{ unit: 0, page: 3 },
			{ unit: 2, page: 7 },
			{ unit: 3, page: 0 },
			{ unit: -1, page: 0 },
			{ unit: 0, page: -1 },
			{ unit: 0.5, page: 0 },
			{ unit: 0, page: NaN }
		]) {
			expect(flatIndexOf(missing, COUNTS), JSON.stringify(missing)).toBeNull();
		}
	});

	it('finds the page at a flat index', () => {
		expect(positionAt(0, COUNTS)).toEqual({ unit: 0, page: 0 });
		expect(positionAt(3, COUNTS)).toEqual({ unit: 1, page: 0 });
		expect(positionAt(6, COUNTS)).toEqual({ unit: 1, page: 3 });
		expect(positionAt(13, COUNTS)).toEqual({ unit: 2, page: 6 });
		for (const outside of [-1, 14, 1.5, NaN]) expect(positionAt(outside, COUNTS)).toBeNull();
	});

	it('skips a unit with no pages', () => {
		expect(positionAt(2, [2, 0, 1])).toEqual({ unit: 2, page: 0 });
		expect(flatIndexOf({ unit: 1, page: 0 }, [2, 0, 1])).toBeNull();
	});

	it('agrees with itself for every page of many sections', () => {
		for (let units = 1; units <= 6; units++) {
			for (let pages = 1; pages <= 5; pages++) {
				const counts = Array.from({ length: units }, (_, u) => ((u * 7 + pages) % 5) + 1);
				flatPositions(counts).forEach((position, index) => {
					expect(flatIndexOf(position, counts)).toBe(index);
					expect(positionAt(index, counts)).toEqual(position);
				});
			}
		}
	});
});

describe('the page hash', () => {
	it('round-trips a page through its hash', () => {
		for (const position of [
			{ unit: 0, page: 3 },
			{ unit: 2, page: 0 },
			{ unit: 2, page: 5 }
		]) {
			expect(decodePageHash(encodePageHash(position))).toEqual(position);
		}
	});

	it("writes '#sub-U' for a unit's first page and '#sub-U-p-P' past it", () => {
		expect(encodePageHash({ unit: 2, page: 0 })).toBe('#sub-2');
		expect(encodePageHash({ unit: 2, page: 5 })).toBe('#sub-2-p-5');
		expect(encodePageHash({ unit: 0, page: 3 })).toBe('#sub-0-p-3');
	});

	it("writes no hash for the section's first page", () => {
		expect(encodePageHash({ unit: 0, page: 0 })).toBe('');
	});

	it("reads '#sub-0' as the first page", () => {
		expect(decodePageHash('#sub-0')).toEqual({ unit: 0, page: 0 });
	});

	// v1.1's parseInt read leading zeros, so a hand-typed link still works
	it('reads numbers with leading zeros', () => {
		expect(decodePageHash('#sub-02-p-003')).toEqual({ unit: 2, page: 3 });
	});

	it('reads nothing from a hash that is not a page hash', () => {
		for (const hash of [
			'',
			'#',
			'#sub-',
			'#sub-a',
			'#sub--1',
			'#sub-1-p-',
			'#sub-1-p-2-x',
			'#sub-1x',
			' #sub-1',
			'sub-1',
			'#Sub-1',
			'#CNX_Chem_05_01_Fig1'
		]) {
			expect(decodePageHash(hash), hash).toBeNull();
		}
	});

	it('opens the page a hash names', () => {
		expect(resolvePageHash('#sub-0', COUNTS)).toBe(0);
		expect(resolvePageHash('#sub-0-p-2', COUNTS)).toBe(2);
		expect(resolvePageHash('#sub-1', COUNTS)).toBe(3);
		expect(resolvePageHash('#sub-2-p-6', COUNTS)).toBe(13);
	});

	// CODE-16: a page past its unit's end opens that unit's last page, not the
	// section's first, so a link from a phone still lands in its sub-section
	it("clamps a page past its unit's end into that unit", () => {
		expect(resolvePageHash('#sub-2-p-10', COUNTS)).toBe(13);
		expect(positionAt(resolvePageHash('#sub-2-p-10', COUNTS)!, COUNTS)).toEqual({ unit: 2, page: 6 });
		expect(resolvePageHash('#sub-1-p-99', COUNTS)).toBe(6);
		expect(resolvePageHash('#sub-0-p-3', COUNTS)).toBe(2);
		expect(resolvePageHash('#sub-1-p-99999999999999999999', COUNTS)).toBe(6);
		// The label then names the unit the link was for
		expect(positionLabel(positionAt(6, COUNTS)!, COUNTS)).toMatch(/^Hluti 2 af 3 /);
	});

	it('opens nothing for a unit the section lacks, or a hash that names no page', () => {
		expect(resolvePageHash('#sub-3', COUNTS)).toBeNull();
		expect(resolvePageHash('#sub-9-p-1', COUNTS)).toBeNull();
		expect(resolvePageHash('#sub-1', [2, 0, 1])).toBeNull();
		expect(resolvePageHash('', COUNTS)).toBeNull();
		expect(resolvePageHash('#CNX_Chem_05_01_Fig1', COUNTS)).toBeNull();
	});

	it('round-trips every page of a section through resolvePageHash', () => {
		const counts = [1, 3, 2, 5];
		flatPositions(counts).forEach((position, index) => {
			const hash = encodePageHash(position);
			expect(hash === '' ? 0 : resolvePageHash(hash, counts)).toBe(index);
		});
	});
});

describe('positionLabel', () => {
	it('names the unit and the page within it', () => {
		expect(positionLabel({ unit: 0, page: 0 }, COUNTS)).toBe('Hluti 1 af 3 · Síða 1 af 3');
		expect(positionLabel({ unit: 1, page: 2 }, COUNTS)).toBe('Hluti 2 af 3 · Síða 3 af 4');
		expect(positionLabel({ unit: 2, page: 6 }, COUNTS)).toBe('Hluti 3 af 3 · Síða 7 af 7');
	});

	it('reads a unit with no page count as one page', () => {
		expect(positionLabel({ unit: 3, page: 0 }, COUNTS)).toBe('Hluti 4 af 3 · Síða 1 af 1');
	});
});

// Plan step S9.2 (UI-05): the position a screen reader hears names the sub-section, with
// commas where the label has '·', since how screen readers voice '·' is not verified
describe('spokenPosition', () => {
	it('names the sub-section between the unit and the page', () => {
		expect(spokenPosition({ unit: 1, page: 2 }, COUNTS, 'Flokkun efnis')).toBe(
			'Hluti 2 af 3: Flokkun efnis, síða 3 af 4'
		);
	});

	it('gives the position alone for a unit with no heading (the intro)', () => {
		expect(spokenPosition({ unit: 0, page: 1 }, COUNTS, null)).toBe('Hluti 1 af 3, síða 2 af 3');
	});

	it('reads an empty heading as none', () => {
		expect(spokenPosition({ unit: 0, page: 0 }, COUNTS, '')).toBe('Hluti 1 af 3, síða 1 af 3');
	});

	it('reads a unit with no page count as one page', () => {
		expect(spokenPosition({ unit: 3, page: 0 }, COUNTS, 'S')).toBe('Hluti 4 af 3: S, síða 1 af 1');
	});
});

describe('keyAction', () => {
	const key = (k: string, extra: Partial<PageKey> = {}): PageKey => ({
		key: k,
		shiftKey: false,
		ctrlKey: false,
		metaKey: false,
		altKey: false,
		defaultPrevented: false,
		...extra
	});
	const free: KeyContext = { typing: false, belongsElsewhere: false, focusOnControl: false };

	it('turns forward on →, PageDown and Space', () => {
		expect(keyAction(key('ArrowRight'), free)).toBe('next');
		expect(keyAction(key('PageDown'), free)).toBe('next');
		expect(keyAction(key(' '), free)).toBe('next');
	});

	it('turns back on ←, PageUp and Shift+Space', () => {
		expect(keyAction(key('ArrowLeft'), free)).toBe('prev');
		expect(keyAction(key('PageUp'), free)).toBe('prev');
		expect(keyAction(key(' ', { shiftKey: true }), free)).toBe('prev');
	});

	it('leaves other keys alone', () => {
		for (const k of ['ArrowUp', 'ArrowDown', 'Enter', 'Home', 'End', 'n', 'Spacebar', 'Tab']) {
			expect(keyAction(key(k), free), k).toBeNull();
		}
	});

	it('never turns with Ctrl, Cmd or Alt held', () => {
		for (const held of ['ctrlKey', 'metaKey', 'altKey'] as const) {
			for (const k of ['ArrowRight', 'ArrowLeft', ' ']) {
				expect(keyAction(key(k, { [held]: true }), free), `${held} ${k}`).toBeNull();
			}
		}
	});

	it('steps aside when the key is already handled, typed or belongs elsewhere', () => {
		expect(keyAction(key('ArrowRight', { defaultPrevented: true }), free)).toBeNull();
		expect(keyAction(key('ArrowRight'), { ...free, typing: true })).toBeNull();
		expect(keyAction(key(' '), { ...free, typing: true })).toBeNull();
		expect(keyAction(key('ArrowLeft'), { ...free, belongsElsewhere: true })).toBeNull();
	});

	it('lets Space press a focused control, while the arrows still turn', () => {
		const onControl = { ...free, focusOnControl: true };
		expect(keyAction(key(' '), onControl)).toBeNull();
		expect(keyAction(key(' ', { shiftKey: true }), onControl)).toBeNull();
		expect(keyAction(key('ArrowRight'), onControl)).toBe('next');
		expect(keyAction(key('PageUp'), onControl)).toBe('prev');
	});

	// Shift only matters for Space here; Shift+arrow (extending a selection) is
	// keyBelongsElsewhere's to refuse, through `belongsElsewhere`
	it('turns on Shift+arrow when nothing else claims it', () => {
		expect(keyAction(key('ArrowRight', { shiftKey: true }), free)).toBe('next');
		expect(keyAction(key('PageDown', { shiftKey: true }), free)).toBe('next');
	});

	it('takes a KeyboardEvent as it is', () => {
		expect(keyAction(new KeyboardEvent('keydown', { key: 'ArrowLeft' }), free)).toBe('prev');
		expect(keyAction(new KeyboardEvent('keydown', { key: 'ArrowRight', ctrlKey: true }), free)).toBeNull();
	});
});

// D11 (2026-11-08), CODE-06: Space and PageDown scroll a page taller than the window before
// they turn it. The geometry is arbitrary on purpose: the helper takes the window it is given
// and reads no page budget.
describe('keyScroll', () => {
	const view = { top: 100, bottom: 700 }; // 600 px of window
	const screen = 600 - KEY_SCROLL.overlap; // the most one press moves

	it("scrolls Space down by the rest of a page that ends below the window, when that's under a screen", () => {
		expect(keyScroll(' ', 'next', { top: 100, bottom: 950 }, view)).toBe(250);
	});

	it('scrolls Space down by a screen less the overlap when more than a screen is left', () => {
		expect(keyScroll(' ', 'next', { top: 100, bottom: 3000 }, view)).toBe(screen);
	});

	it('scrolls PageDown as it scrolls Space', () => {
		expect(keyScroll('PageDown', 'next', { top: 100, bottom: 950 }, view)).toBe(250);
	});

	it("turns when the page's end is in view", () => {
		expect(keyScroll(' ', 'next', { top: 100, bottom: 650 }, view)).toBe(0);
	});

	it("turns when the page's end is below the window by no more than the tolerance", () => {
		expect(keyScroll(' ', 'next', { top: 100, bottom: 700 + KEY_SCROLL.tolerance }, view)).toBe(0);
	});

	it("scrolls when the page's end is below the window by more than the tolerance", () => {
		expect(keyScroll(' ', 'next', { top: 100, bottom: 701 + KEY_SCROLL.tolerance }, view)).toBe(1 + KEY_SCROLL.tolerance);
	});

	it("scrolls Shift+Space up by the rest of a page whose top is above the window", () => {
		expect(keyScroll(' ', 'prev', { top: -150, bottom: 650 }, view)).toBe(-250);
	});

	it('scrolls PageUp up by at most a screen less the overlap', () => {
		expect(keyScroll('PageUp', 'prev', { top: -2000, bottom: 650 }, view)).toBe(-screen);
	});

	it("turns back when the page's top is in view, wherever its end is", () => {
		expect(keyScroll('PageUp', 'prev', { top: 100, bottom: 3000 }, view)).toBe(0);
	});

	it("turns forward when the page's end is in view, wherever its top is", () => {
		expect(keyScroll('PageDown', 'next', { top: -2000, bottom: 650 }, view)).toBe(0);
	});

	it('never scrolls for an arrow key', () => {
		expect(keyScroll('ArrowRight', 'next', { top: 100, bottom: 3000 }, view)).toBe(0);
		expect(keyScroll('ArrowLeft', 'prev', { top: -2000, bottom: 650 }, view)).toBe(0);
	});

	it('still moves forward in a window shorter than two overlaps', () => {
		expect(keyScroll(' ', 'next', { top: 100, bottom: 3000 }, { top: 100, bottom: 140 })).toBe(20);
	});

	it('turns when the window shows no content at all', () => {
		expect(keyScroll(' ', 'next', { top: 100, bottom: 3000 }, { top: 100, bottom: 100 })).toBe(0);
	});
});

describe('swipes', () => {
	// v1.1's thresholds (dde768e :314); no e2e test swipes
	it("holds v1.1's thresholds", () => {
		expect(SWIPE).toEqual({ minDistance: 60, maxDrift: 40 });
	});

	it('needs more than the minimum distance sideways', () => {
		expect(isPageSwipe(SWIPE.minDistance, 0)).toBe(false);
		expect(isPageSwipe(SWIPE.minDistance + 1, 0)).toBe(true);
		expect(isPageSwipe(-SWIPE.minDistance, 0)).toBe(false);
		expect(isPageSwipe(-SWIPE.minDistance - 1, 0)).toBe(true);
	});

	it('needs less than the maximum drift up or down', () => {
		const far = SWIPE.minDistance + 50;
		expect(isPageSwipe(far, SWIPE.maxDrift - 1)).toBe(true);
		expect(isPageSwipe(far, SWIPE.maxDrift)).toBe(false);
		expect(isPageSwipe(far, -(SWIPE.maxDrift - 1))).toBe(true);
		expect(isPageSwipe(far, -SWIPE.maxDrift)).toBe(false);
	});

	it('is no swipe for a non-number', () => {
		expect(isPageSwipe(NaN, 0)).toBe(false);
		expect(isPageSwipe(200, NaN)).toBe(false);
	});

	const clear: TouchContext = { multiTouch: false, selecting: false, inSidewaysBox: false };
	const far = SWIPE.minDistance + 1;

	it('turns forward on a swipe to the left and back on one to the right', () => {
		expect(swipeAction(-far, 0, clear)).toBe('next');
		expect(swipeAction(far, 0, clear)).toBe('prev');
		expect(swipeAction(far, SWIPE.maxDrift, clear)).toBeNull();
		expect(swipeAction(SWIPE.minDistance, 0, clear)).toBeNull();
	});

	// S9.1, CODE-09: a pinch, a selection drag or a drag that scrolls a wide table is no swipe
	it('is no turn when a second finger was down', () => {
		expect(swipeAction(-far, 0, { ...clear, multiTouch: true })).toBeNull();
	});

	it('is no turn while text is selected', () => {
		expect(swipeAction(-far, 0, { ...clear, selecting: true })).toBeNull();
	});

	it('is no turn when the touch began inside a box that scrolls sideways', () => {
		expect(swipeAction(far, 0, { ...clear, inSidewaysBox: true })).toBeNull();
	});
});

describe('steps', () => {
	const none = { section: false, units: new Set<number>() };

	it('moves to the next page inside a unit', () => {
		expect(stepNext(0, COUNTS, none)).toEqual({ index: 1, unitComplete: null, sectionComplete: false });
	});

	it("completes a unit when 'Næsta' leaves its last page", () => {
		expect(stepNext(2, COUNTS, none)).toEqual({ index: 3, unitComplete: 0, sectionComplete: false });
		expect(stepNext(6, COUNTS, none)).toEqual({ index: 7, unitComplete: 1, sectionComplete: false });
	});

	it('completes a unit once', () => {
		expect(stepNext(2, COUNTS, { section: false, units: new Set([0]) }).unitComplete).toBeNull();
	});

	// Ruling 3: 'Næsta' on the last page finishes the section, even for a
	// reader who came in by a link to a later unit and skipped the others
	it("finishes the section on the last page's 'Næsta', with earlier units unread", () => {
		expect(stepNext(13, COUNTS, none)).toEqual({ index: null, unitComplete: 2, sectionComplete: true });
	});

	it('finishes the section once', () => {
		const after = { section: true, units: new Set([2]) };
		expect(stepNext(13, COUNTS, after)).toEqual({ index: null, unitComplete: null, sectionComplete: false });
	});

	// The two records are separate: a re-split can rebuild the units after the
	// last one was marked read, and the section's 'once' rests on its own flag
	it('keeps the unit and section records apart', () => {
		expect(stepNext(13, COUNTS, { section: false, units: new Set([2]) })).toEqual({
			index: null,
			unitComplete: null,
			sectionComplete: true
		});
		expect(stepNext(13, COUNTS, { section: true, units: new Set<number>() })).toEqual({
			index: null,
			unitComplete: 2,
			sectionComplete: false
		});
	});

	it('finishes a one-page section on its only page', () => {
		expect(stepNext(0, [1], none)).toEqual({ index: null, unitComplete: 0, sectionComplete: true });
	});

	it('does nothing from a page the section lacks', () => {
		for (const outside of [-1, 14, NaN]) {
			expect(stepNext(outside, COUNTS, none)).toEqual({
				index: null,
				unitComplete: null,
				sectionComplete: false
			});
		}
	});

	it("goes back one page on 'Fyrri', and nowhere from the first", () => {
		expect(stepPrev(5, COUNTS)).toBe(4);
		expect(stepPrev(3, COUNTS)).toBe(2);
		expect(stepPrev(1, COUNTS)).toBe(0);
		expect(stepPrev(13, COUNTS)).toBe(12);
		expect(stepPrev(0, COUNTS)).toBeNull();
	});

	it("goes nowhere on 'Fyrri' from a page the section lacks", () => {
		for (const outside of [14, 15, -1, NaN]) expect(stepPrev(outside, COUNTS)).toBeNull();
	});
});

describe('re-splits', () => {
	// Unit 0: 2 pages over 5 blocks; unit 1: 3 pages over 6 blocks
	const before: PageRange[][] = [
		[
			{ start: 0, end: 3 },
			{ start: 3, end: 5 }
		],
		[
			{ start: 0, end: 2 },
			{ start: 2, end: 4 },
			{ start: 4, end: 6 }
		]
	];
	// After a larger font: unit 0 needs 3 pages, unit 1 needs 4
	const after: PageRange[][] = [
		[
			{ start: 0, end: 2 },
			{ start: 2, end: 4 },
			{ start: 4, end: 5 }
		],
		[
			{ start: 0, end: 1 },
			{ start: 1, end: 3 },
			{ start: 3, end: 5 },
			{ start: 5, end: 6 }
		]
	];

	it("anchors on the shown page's first block", () => {
		expect(pageAnchor({ unit: 1, page: 2 }, before)).toEqual({ unit: 1, item: 4 });
		expect(pageAnchor({ unit: 0, page: 0 }, before)).toEqual({ unit: 0, item: 0 });
		expect(pageAnchor({ unit: 2, page: 0 }, before)).toBeNull();
		expect(pageAnchor({ unit: 0, page: 2 }, before)).toBeNull();
		expect(pageAnchor(undefined, before)).toBeNull();
		expect(pageAnchor(null, before)).toBeNull();
	});

	it('finds the page holding a block', () => {
		expect(flatIndexForItem({ unit: 0, item: 4 }, after)).toBe(2);
		expect(flatIndexForItem({ unit: 1, item: 0 }, after)).toBe(3);
		expect(flatIndexForItem({ unit: 1, item: 4 }, after)).toBe(5);
		// A block past the unit's end is on its last page, as pageIndexForItem has it
		expect(flatIndexForItem({ unit: 1, item: 40 }, after)).toBe(6);
		expect(flatIndexForItem({ unit: 2, item: 0 }, after)).toBeNull();
		expect(flatIndexForItem({ unit: -1, item: 0 }, after)).toBeNull();
		expect(flatIndexForItem({ unit: 0.5, item: 0 }, after)).toBeNull();
	});

	// itemIndexForTarget's -1 means 'not found', not 'the last page'
	it('finds no page for a block index that is not one', () => {
		for (const item of [-1, NaN, 1.5]) expect(flatIndexForItem({ unit: 1, item }, after), String(item)).toBeNull();
		expect(pageAfterResplit({ target: { unit: 1, item: -1 }, anchor: { unit: 0, item: 0 } }, after)).toBe(0);
	});

	it('keeps the block the reader was on in view across a re-split', () => {
		const anchor = pageAnchor({ unit: 1, page: 2 }, before);
		expect(pageAfterResplit({ target: null, anchor }, after)).toBe(5);
		expect(positionAt(5, after.map((u) => u.length))).toEqual({ unit: 1, page: 2 });
	});

	// QA E8: a late image can push a deep-link target onto the next page
	it("prefers the deep-link target's page to the anchor's", () => {
		expect(
			pageAfterResplit({ target: { unit: 1, item: 5 }, anchor: { unit: 0, item: 0 } }, after)
		).toBe(6);
	});

	it('opens the first page when the target is on it, not the anchor', () => {
		expect(
			pageAfterResplit({ target: { unit: 0, item: 1 }, anchor: { unit: 1, item: 5 } }, after)
		).toBe(0);
	});

	it('falls back to the anchor when the target is no longer in the section', () => {
		expect(
			pageAfterResplit({ target: { unit: 5, item: 0 }, anchor: { unit: 1, item: 3 } }, after)
		).toBe(5);
	});

	it('opens the first page with neither, or with an anchor in a unit that is gone', () => {
		expect(pageAfterResplit({ target: null, anchor: null }, after)).toBe(0);
		expect(pageAfterResplit({ target: null, anchor: { unit: 4, item: 0 } }, after)).toBe(0);
	});
});

describe('pagerState (S8.4, CODE-17)', () => {
	const base = { failed: false, live: true, current: 0, pages: 3, sectionComplete: false };
	it("is 'failed' first, then 'pending' until live, then 'end' only on the last page once complete", () => {
		expect(pagerState({ ...base, failed: true, live: false })).toBe('failed');
		expect(pagerState({ ...base, live: false })).toBe('pending');
		expect(pagerState(base)).toBe('ready');
		expect(pagerState({ ...base, current: 2 })).toBe('ready');
		expect(pagerState({ ...base, current: 1, sectionComplete: true })).toBe('ready');
		expect(pagerState({ ...base, current: 2, sectionComplete: true })).toBe('end');
	});
});

// Plan step S9.3 (CODE-07): switching to paged opens the page holding the block the reader is
// at: the first block with at least half of it below the top of the reading view, or one that
// runs past the view's bottom (a block taller than the view, which the reader is inside)
describe('firstInView', () => {
	const span = (top: number, bottom: number) => ({ top, bottom });
	const VIEW = span(96, 724);

	it('skips a block whose last sliver shows under the top: the page before', () => {
		// After a switch to scrolling the page's first block sits under the running title, and
		// the block before it ends just above, still below the view's top
		expect(firstInView([span(-60, 140), span(156, 400)], VIEW)).toBe(1);
	});

	it('takes a block half or more of which is below the top', () => {
		expect(firstInView([span(-100, 300), span(310, 500)], VIEW)).toBe(0);
		expect(firstInView([span(-150, 250), span(260, 500)], VIEW)).toBe(1);
	});

	it('takes a block that runs past the bottom of the view, however much is above', () => {
		expect(firstInView([span(-700, 1500), span(1510, 1600)], VIEW)).toBe(0);
	});

	it('skips a block above the top, and one with no height', () => {
		expect(firstInView([span(-400, -100), span(200, 200), span(200, 500)], VIEW)).toBe(2);
	});

	it('gives -1 when there is no block in view', () => {
		expect(firstInView([span(-400, -100)], VIEW)).toBe(-1);
		expect(firstInView([], VIEW)).toBe(-1);
	});
});
