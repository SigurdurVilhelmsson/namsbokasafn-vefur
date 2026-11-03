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
 * equations and boxes as "atomic"; the flag changed no split for any positive
 * height and only gave a 0 px block before an oversized one a page of its own,
 * so plan step S8.1 deleted it (register CODE-18, CODE-20).
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
 * Split `items` into pages of at most `viewportH` px.
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
 * A block of 0 px or less (an empty element, or negative margins) never makes
 * a page of its own, which would show nothing, and never parts a heading from
 * the block after it: it always fits on the page it follows, travels with the
 * headings and block after it when they open a new page, and at the end of the
 * items joins the last page.
 */
export function paginate(items: PaginateItem[], viewportH: number): PageRange[] {
	const pages: PageRange[] = [];
	let start = 0;
	let pageH = 0;

	const flush = (end: number) => {
		if (end > start) {
			pages.push({ start, end });
			start = end;
			pageH = 0;
		}
	};
	/** Start of the run of headings directly before `i` on the current page.
	 *  A block of 0 px or less in or before the run travels with it. */
	const headingsBefore = (i: number) => {
		let s = i;
		while (s > start && (items[s - 1].keepWithNext || items[s - 1].height <= 0)) s--;
		return s;
	};

	let i = 0;
	while (i < items.length) {
		const item = items[i];

		// The first item on a page always goes on it, even if oversized: the
		// next item then breaks, so the block keeps a page of its own and the
		// window scrolls there. A heading taller than the page keeps the
		// block after it, through the headings-only rule below. A block of
		// 0 px or less always fits, so it never stands in for that block.
		if (pageH === 0 || item.height <= 0 || pageH + item.height <= viewportH) {
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

	// Blocks of 0 px or less left after the last break join the page before them
	if (pages.length > 0 && items.slice(start).every((item) => item.height <= 0)) {
		pages[pages.length - 1].end = items.length;
	} else {
		flush(items.length);
	}
	return pages;
}

/** Find the page containing a given item index (e.g. a deep-link target) */
export function pageIndexForItem(pages: PageRange[], itemIndex: number): number {
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
 * Split a module's blocks into units at its <section> boundaries.
 *
 * efni's renderer puts the module body in <main>, after a <header> with the
 * title (`article.cnx-module > header + main`). The blocks to paginate are
 * <main>'s children, so <main> is looked through rather than treated as one
 * block, which made a whole section a single page. Markup without <main>
 * (the shape this was first written against) still works.
 */
export function buildUnits(root: HTMLElement): ContentUnit[] {
	const result: ContentUnit[] = [];
	let intro: HTMLElement[] = [];
	const blocks = (Array.from(root.children) as HTMLElement[]).flatMap((el) =>
		el.tagName === 'MAIN' ? (Array.from(el.children) as HTMLElement[]) : [el]
	);

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
 * Index of the block a deep-link target lands on, or -1 if it is not in `items`.
 * The target can be a block, sit inside one, or (a nested sub-section, which
 * buildUnits pages block by block) contain blocks: then its first block wins.
 */
export function itemIndexForTarget(items: HTMLElement[], target: HTMLElement): number {
	return items.findIndex((el) => el === target || el.contains(target) || target.contains(el));
}
