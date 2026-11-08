/**
 * Page-break algorithm for the hybrid paged reading mode (reader plan P0.4).
 *
 * Pure function over measured block items: given each block's height and
 * whether it is a heading, produce inner-page ranges that fit the available
 * height. DOM measurement lives in the consumer (PagedReaderControls), and the
 * pager's other decisions (budget, hash, keys, swipes, steps) in pager.ts;
 * keeping this pure makes the break logic testable. It imports nothing.
 */

/** Headings, kept on the same page as the block after them. */
export const KEEP_WITH_NEXT_SELECTOR = 'h2, h3, h4';

/**
 * Every block is whole: pages break only between blocks, never inside one, so a
 * block taller than the page gets a page of its own (with the headings before
 * it) and the window scrolls there. v1.1 also flagged figures, tables, display
 * equations and boxes as "atomic". No block was both atomic and a heading (the
 * two selectors never matched the same element), so the flag changed no split
 * for any positive height and only gave a 0 px block before an oversized one a
 * page of its own; plan step S8.1 deleted it (register CODE-18, CODE-20).
 */
export interface PaginateItem {
	/** Measured block height in px (margins included by the measurer) */
	height: number;
	/** Headings: if this would be the last item on a page, move it to the
	 *  top of the next page instead */
	keepWithNext: boolean;
}

/** How the page breaker treats a rendered block: only headings are special */
export function classifyBlock(el: Element): Pick<PaginateItem, 'keepWithNext'> {
	return { keepWithNext: el.matches(KEEP_WITH_NEXT_SELECTOR) };
}

/** Half-open index range [start, end) into the item list */
export interface PageRange {
	start: number;
	end: number;
}

/**
 * Split the items into pages of at most `viewportH` px.
 *
 * A page is as full as it can be: it ends only where its next block (with the
 * headings carried over to introduce it) would not fit. It runs over the budget
 * only when every sized block on it but the last is a heading: an oversized
 * block opening a page, or headings kept with the block after them. When a
 * heading plus the block after it overruns a page, they share it and the page
 * overruns by the heading: one extra page turn for a lone heading was the worse
 * trade (QA E4). A page's last sized block is a heading only when it is the
 * last page, or when two or more headings overran the page together.
 *
 * A block of 0 px (an empty element) never makes a page of its own, which would
 * show nothing, and never parts a heading from the block after it: it shares
 * the page of the next block taller than 0 px, and at the end of the items
 * joins the last page. A negative height (negative margins) counts as 0 px.
 */
export function paginate(input: PaginateItem[], viewportH: number, firstH: number = viewportH): PageRange[] {
	const items = input.map((item) => (item.height < 0 ? { ...item, height: 0 } : item));
	const pages: PageRange[] = [];
	let start = 0;
	let pageH = 0;
	// The first page may have less room: on the section's first page the machine-translation
	// notice stands above the content (S9.4, UI-09)
	const room = () => (pages.length === 0 ? firstH : viewportH);

	const flush = (end: number) => {
		if (end > start) {
			pages.push({ start, end });
			start = end;
			pageH = 0;
		}
	};
	/** Start of the run of headings directly before `i` on the current page.
	 *  A 0 px block in or before the run travels with it. */
	const headingsBefore = (i: number) => {
		let s = i;
		while (s > start && (items[s - 1].keepWithNext || items[s - 1].height === 0)) s--;
		return s;
	};

	let i = 0;
	while (i < items.length) {
		const item = items[i];

		// The first item on a page always goes on it, even if oversized: the
		// next item then breaks, so the block keeps a page of its own and the
		// window scrolls there. A heading taller than the page keeps the
		// block after it, through the headings-only rule below. A 0 px block
		// always fits, so it never stands in for that block.
		if (pageH === 0 || item.height === 0 || pageH + item.height <= room()) {
			pageH += item.height;
			i++;
			continue;
		}

		// Item doesn't fit: break before it, pulling trailing keep-with-next
		// items (headings, and 0 px blocks among them) over to the new page so
		// they aren't stranded
		const breakAt = headingsBefore(i);
		if (breakAt === start) {
			// The page holds only headings (and 0 px blocks): keep them with
			// this block and let the page overrun, then start the next page
			// after it
			flush(i + 1);
			i++;
			continue;
		}
		flush(breakAt);
		// The carried headings now open this page and count against it
		for (let h = breakAt; h < i; h++) pageH += items[h].height;
	}

	// 0 px blocks left after the last break join the page before them
	if (pages.length > 0 && items.slice(start).every((item) => item.height === 0)) {
		pages[pages.length - 1].end = items.length;
	} else {
		flush(items.length);
	}
	return pages;
}

/** Find the page containing a given item index (e.g. a deep-link target) */
export function pageIndexForItem(pages: readonly PageRange[], itemIndex: number): number {
	for (let p = 0; p < pages.length; p++) {
		if (itemIndex >= pages[p].start && itemIndex < pages[p].end) return p;
	}
	return pages.length > 0 ? pages.length - 1 : 0;
}

/** A reading unit: a sub-section (`wrapper` is its <section>), or a run of
 *  blocks outside the sub-sections (`wrapper` null): the intro before the
 *  first one, or blocks between or after them. */
export interface ContentUnit {
	wrapper: HTMLElement | null;
	children: HTMLElement[];
}

/**
 * A sub-section's pageable blocks. A nested <section> is looked through, so its
 * heading and paragraphs page individually; as one block it overflowed the page.
 * The nested <section> element itself is never hidden, only its blocks.
 */
function sectionBlocks(section: HTMLElement): HTMLElement[] {
	return (Array.from(section.children) as HTMLElement[]).flatMap((el) =>
		el.tagName === 'SECTION' ? sectionBlocks(el) : [el]
	);
}

/**
 * The module body's wrapper, looked through by buildUnits: efni's renderer puts
 * the body in <main> today (`article.cnx-module > header + main`), and plans a
 * non-landmark wrapper instead (register UI-30, efni handoff H5). Both forms stay
 * accepted: the frozen books and a book downloaded for offline reading keep <main>.
 * Matched against the article's direct children only.
 */
export const MODULE_BODY_SELECTOR = 'main, .cnx-body';

/**
 * Split a module's blocks into units at its <section> boundaries.
 *
 * The blocks to paginate are the body wrapper's children (MODULE_BODY_SELECTOR),
 * so the wrapper is looked through rather than treated as one block, which made
 * a whole section a single page. Markup without a wrapper (the shape this was
 * first written against) still works.
 *
 * The module's own <header> (a direct child of the root: the h1, and the static
 * objectives box the section page hides when it shows its own) is in no unit, so
 * the pager never hides it and the title stays above every page (D12, 2026-11-08;
 * UI-19, UI-05). Its height falls into the chrome measured above the first block,
 * so it comes off every page's budget. A body that opens with a sub-section then
 * starts with that unit, where its header used to be a page of its own.
 */
export function buildUnits(root: HTMLElement): ContentUnit[] {
	const result: ContentUnit[] = [];
	let intro: HTMLElement[] = [];
	const blocks = (Array.from(root.children) as HTMLElement[]).flatMap((el) => {
		if (el.tagName === 'HEADER') return [];
		return el.matches(MODULE_BODY_SELECTOR) ? (Array.from(el.children) as HTMLElement[]) : [el];
	});

	for (const child of blocks) {
		if (child.tagName === 'SECTION') {
			if (intro.length > 0) {
				result.push({ wrapper: null, children: intro });
				intro = [];
			}
			result.push({ wrapper: child, children: sectionBlocks(child) });
		} else {
			intro.push(child);
		}
	}
	if (intro.length > 0) result.push({ wrapper: null, children: intro });
	return result;
}

/**
 * A unit's own heading, for the spoken position (plan step S9.2, UI-05): the first h2–h6
 * among its sub-section's children, its spaces collapsed; null for an intro, which has no
 * wrapper, and for a sub-section with no heading of its own (a nested one's is not its own).
 */
export function unitHeading(wrapper: HTMLElement | null): string | null {
	const heading = wrapper && Array.from(wrapper.children).find((el) => /^H[2-6]$/.test(el.tagName));
	const text = heading?.textContent?.replace(/\s+/g, ' ').trim();
	return text || null;
}

/**
 * Index of the block a deep-link target lands on, or -1 if it is not in `items`.
 * The target can be a block, sit inside one, or (a nested sub-section, which
 * buildUnits pages block by block) contain blocks: then its first block wins.
 */
export function itemIndexForTarget(items: HTMLElement[], target: HTMLElement): number {
	return items.findIndex((el) => el === target || el.contains(target) || target.contains(el));
}

// =============================================================================
// D11'S TRIAL: AN OVERSIZED WORKED EXAMPLE BREAKS ONCE
// =============================================================================

/**
 * D11 (2026-11-08) trials one break in a worked example taller than a page, before its
 * check-your-learning part, so that part and its 'Sýna svar' open the next page; batch E
 * judges it on §3.1. The one switch: false keeps every example whole, so it scrolls
 * (D11's (b)), and leaves everything else in place.
 */
export const EXAMPLE_BREAK_TRIAL = true;

/**
 * The direct child a worked example breaks before: the last `p.para-title` before its
 * first answer box (`aside.check-knowledge-answer`), when a solution heading comes before
 * it. Matched on structure only: that heading has eight wordings in chemistry. In all 289
 * chemistry examples (② preview, 2026-11-08) this is the check-your-learning heading; it
 * skips Dæmi 5.15's second solution heading, and keeps Dæmi 5.3's, 12.3's and 13.9's
 * second check-your-learning part with the first. Null for anything else.
 */
export function exampleCut(el: Element): Element | null {
	if (!el.matches('aside.example')) return null;
	const children = Array.from(el.children);
	const answer = children.findIndex((child) => child.matches('aside.check-knowledge-answer'));
	if (answer < 0) return null;
	const headings = children.slice(0, answer).filter((child) => child.matches('p.para-title'));
	return headings.length >= 2 ? headings[headings.length - 1] : null;
}

/** A measured block, with the height of the part before its cut when it can break */
export interface BreakableItem extends PaginateItem {
	firstPart?: number;
}

/** What of a block a piece is: all of it, or the part before or from its cut */
export type BlockPart = 'whole' | 'first' | 'second';

/** What paginate() pages: a block, or one part of a block it broke */
export interface Piece extends PaginateItem {
	block: number;
	part: BlockPart;
}

/**
 * The pieces to page: every block whole, except a breakable block taller than the page,
 * which goes in as its two parts. One that fits stays whole: broken, its first part could
 * close a page and send the check-your-learning part to the next one, which is worse than
 * the whole example opening the next page.
 */
export function splitPieces(items: BreakableItem[], viewportH: number): Piece[] {
	return items.flatMap(({ height, keepWithNext, firstPart }, block): Piece[] => {
		const breaks = firstPart !== undefined && firstPart > 0 && firstPart < height && height > viewportH;
		if (!breaks) return [{ block, part: 'whole', height, keepWithNext }];
		return [
			{ block, part: 'first', height: firstPart, keepWithNext: false },
			{ block, part: 'second', height: height - firstPart, keepWithNext: false }
		];
	});
}

/** The blocks a page shows, each with the part of it that shows */
export function shownParts(pieces: readonly Piece[], range: PageRange): Map<number, BlockPart> {
	const shown = new Map<number, BlockPart>();
	for (const piece of pieces.slice(range.start, range.end)) {
		const before = shown.get(piece.block);
		shown.set(piece.block, before && before !== piece.part ? 'whole' : piece.part);
	}
	return shown;
}

/**
 * The piece holding a block's part, or -1 when the block is not there. A block now whole
 * answers for either part; a block now broken answers 'whole' with its first part. So a
 * place kept across a re-split, which can break or join a block, still finds its piece.
 */
export function pieceOf(pieces: readonly Piece[], block: number, part: BlockPart): number {
	let first = -1;
	for (let i = 0; i < pieces.length; i++) {
		if (pieces[i].block !== block) continue;
		if (pieces[i].part === part || pieces[i].part === 'whole') return i;
		if (first < 0) first = i;
	}
	return first;
}
