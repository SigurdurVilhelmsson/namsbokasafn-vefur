/**
 * Page-break algorithm for the hybrid paged reading mode (reader plan P0.4).
 *
 * Pure function over measured block items: given each block's height and
 * break classification, produce inner-page ranges that fit the available
 * viewport height. DOM measurement and classification live in the consumer
 * (PagedReaderControls); keeping this pure makes the break logic testable.
 */

export interface PaginateItem {
	/** Measured block height in px (margins included by the measurer) */
	height: number;
	/** Never split across pages and never left dangling mid-overflow:
	 *  figures, tables, display equations, note/example boxes */
	atomic: boolean;
	/** Headings: if this would be the last item on a page, move it to the
	 *  top of the next page instead */
	keepWithNext: boolean;
}

/** Half-open index range [start, end) into the item list */
export interface PageRange {
	start: number;
	end: number;
}

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

	let i = 0;
	while (i < items.length) {
		const item = items[i];

		// Unavoidable overflow: an atomic block taller than the page gets a
		// page of its own (it scrolls internally in the renderer)
		if (item.atomic && item.height > viewportH) {
			flush(i);
			pages.push({ start: i, end: i + 1 });
			start = i + 1;
			i++;
			continue;
		}

		// First item on a page always goes on it, even if oversized
		// (non-atomic text blocks taller than the viewport are rare)
		if (pageH === 0 || pageH + item.height <= viewportH) {
			pageH += item.height;
			i++;
			continue;
		}

		// Item doesn't fit: break before it, pulling trailing keep-with-next
		// items (headings) over to the new page so they aren't stranded
		let breakAt = i;
		while (breakAt > start && items[breakAt - 1].keepWithNext) {
			breakAt--;
		}
		if (breakAt === start) {
			// Page would be empty — accept the stranded heading
			breakAt = i;
		}
		flush(breakAt);
	}

	flush(items.length);
	return pages;
}

/** Find the page containing a given item index (e.g. a deep-link target) */
export function pageIndexForItem(pages: PageRange[], itemIndex: number): number {
	for (let p = 0; p < pages.length; p++) {
		if (itemIndex >= pages[p].start && itemIndex < pages[p].end) return p;
	}
	return pages.length > 0 ? pages.length - 1 : 0;
}

/** A reading unit: a sub-section (`wrapper` is its <section>), or the intro
 *  blocks before the first sub-section (`wrapper` null). */
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
