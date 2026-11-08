<!--
  PagedReaderControls - Hybrid viewport-aware pagination (reader plan P0.4)

  Outer level: the sub-section boundaries already present in the prerendered
  HTML (article.cnx-module > main > section, or efni's planned .cnx-body in
  place of main; buildUnits and MODULE_BODY_SELECTOR in utils/paginate.ts).
  Inner level: viewport-fitting page splits computed by utils/paginate.ts over
  measured block heights.

  Pages are applied by HIDING out-of-page blocks rather than moving them:
  the DOM the content actions (practiceReveal, glossaryTerms, equations, ...) enhanced
  stays intact, so their listeners survive page turns. Restoring visibility
  (mode switch, destroy, failure) returns the exact scrolled experience.
-->
<script lang="ts">
	import { tick, untrack } from 'svelte';
	import { get } from 'svelte/store';
	import Icon from '$lib/components/Icon.svelte';
	import { browser } from '$app/environment';
	import { settings } from '$lib/stores/settings';
	// Aliased: the component has its own announce() and announcement
	import { announce as speak, announcement as liveText } from '$lib/stores/announcer';
	import { isTyping, keyBelongsElsewhere, scrollsSideways } from '$lib/actions/keyboardShortcuts';
	import { openFigure } from '$lib/actions/figureViewer';
	import {
		paginate,
		buildUnits as buildContentUnits,
		itemIndexForTarget,
		classifyBlock,
		EXAMPLE_BREAK_TRIAL,
		exampleCut,
		splitPieces,
		shownParts,
		pieceOf,
		unitHeading,
		type BlockPart,
		type PageRange,
		type Piece
	} from '$lib/utils/paginate';
	import {
		PAGE_BUDGET,
		pageHeights,
		encodePageHash,
		resolvePageHash,
		decodePageHash,
		positionLabel,
		spokenPosition,
		keyAction,
		swipeAction,
		stepNext,
		stepPrev,
		pageAnchor,
		pageAfterResplit,
		flatIndexForItem,
		pagerState,
		keyScroll,
		KEY_SCROLL,
		type ItemPosition,
		type PagerState,
		type VerticalSpan
	} from '$lib/utils/pager';

	interface Props {
		/** Wrapper around the rendered content (contains .reading-content) */
		container: HTMLElement | undefined;
		/** Fired when the reader advances past the last page of the last
		 *  sub-section — the paged-mode equivalent of "scrolled to the end" */
		oncomplete?: () => void;
		/** Fired once per sub-section when its last page is advanced past. The section page
		 *  passes none: call 2 ruled recall once per section (2026-10-23); plan step S11.7
		 *  would wire it only under a later ruling. */
		onsubsectioncomplete?: (index: number) => void;
		/** Each change of state, for the section page's ← / → step-aside and end marker */
		onstatechange?: (state: PagerState) => void;
		/** The section's end (the recall prompt) is open in the page's place: hide the page and
		 *  hold re-splits until it closes (S9.3, UI-21) */
		covered?: boolean;
		/** 'Fyrri' or ← while covered: the page should show the page again, not turn back */
		onuncover?: () => void;
		/** A block to open on, ahead of the address's hash: where the reader was when they
		 *  switched to paged (S9.3, CODE-07) */
		startAt?: HTMLElement | null;
		/** Shows 'Samfellt skrun' in the label row, the in-view way out (S9.3, UI-05, PED-01) */
		onleave?: () => void;
		/** The machine-translation notice in the container above the content: shown above the
		 *  section's first page only, which is budgeted for it (S9.4, UI-09) */
		lead?: HTMLElement | null;
		/** 'Tilkynna villu''s address for an unreviewed section: the label row carries the
		 *  compact 'Vélþýtt' marker with it on every page; none for a reviewed one (S9.4) */
		mtReport?: string | null;
		/** Room the section page should add at its end, in px, when the document is too short to
		 *  bring the content top under the header (S9.5; UI-19's arrival shortfall) */
		onreserve?: (px: number) => void;
		/** A page shown is taller than the part of the window it is read in, so the reader has to
		 *  scroll it: once each time such a page is shown (S9.5, PED-17's local counter) */
		ontallpage?: () => void;
	}

	let {
		container,
		oncomplete,
		onsubsectioncomplete,
		onstatechange,
		covered = false,
		onuncover,
		startAt = null,
		onleave,
		lead = null,
		mtReport = null,
		onreserve,
		ontallpage
	}: Props = $props();

	interface Unit {
		wrapper: HTMLElement | null; // the <section>, or null for intro content
		children: HTMLElement[];
		/** Per block, the child an oversized worked example breaks before (D11's trial) */
		cuts: (Element | null)[];
		/** What the pages index: each block, or the two parts of a block that broke */
		pieces: Piece[];
		pages: PageRange[];
	}

	let units: Unit[] = $state([]);
	let flatPages: { unit: number; page: number }[] = $state([]);
	let current = $state(0);
	let ready = $state(false);
	let failed = $state(false);
	let announcement = $state('');

	const completedUnits = new Set<number>();
	let completionFired = $state(false);

	let recomputeTimer: ReturnType<typeof setTimeout> | undefined;
	/** A re-split held while covered. Not $state. */
	let resplitWhenUncovered = false;
	/** Whether the page on screen is covered, as last applied. Not $state. */
	let appliedCovered = false;
	/** This effect run's controller: its abort removes every listener init added. Not $state. */
	let run: AbortController | undefined;
	/** The keys, swipes and hash changes are live (init's last step). Not $state. */
	let live = false;
	let reported: PagerState | null = null;

	/** Tell the page the state, on a change only; a destroyed pager says nothing */
	function report() {
		if (!failed && run?.signal.aborted) return;
		const state = pagerState({
			failed,
			live,
			current,
			pages: flatPages.length,
			sectionComplete: completionFired
		});
		if (state === reported) return;
		reported = state;
		onstatechange?.(state);
	}
	let navEl: HTMLElement | undefined = $state();

	/** How long to wait for images before the first split (QA E2/E8/E9) */
	const IMAGE_WAIT_MS = 1500;

	/** Chrome measured from the layout: between the container top and the first
	 *  block, and between the last block and the bottom of the page controls.
	 *  Until the controls exist the gap below is an estimate, corrected by
	 *  calibrate() once they render. */
	let gapAbove = 0;
	let gapBelow = PAGE_BUDGET.initialGapBelow;
	/** The notice's share of gapAbove: page 1 has it, the rest do not (S9.4) */
	let leadInset = 0;
	/** The page heights the last split used, on the nav for the e2e budget log (S9.5, UI-08) */
	let heights = $state({ page: 0, firstPage: 0 });

	/** The deep-link / cross-reference target the reader was sent to. While set,
	 *  a re-split keeps its page on screen; any page turn clears it. */
	let target: HTMLElement | null = null;

	/** Reading height of a page, scrolled to the content top, and of the section's first page,
	 *  under the notice. It used to be the viewport minus a fixed 260px; the real chrome is
	 *  larger (QA E1). */
	function availableHeights(): { page: number; firstPage: number } {
		return pageHeights({
			innerHeight: window.innerHeight,
			gapWithLead: gapAbove,
			leadInset,
			gapBelow,
			scrollOffset: contentTop()
		});
	}

	/**
	 * Where a turn parks the content top: just under the sticky header, measured (S9.5; UI-08's
	 * trim (i), call 1's step 1). A fixed 96 px left about 40 px blank under the 56 px header on
	 * every page. With no header (focus mode) it is the gap alone. The one offset source: the
	 * turn's scroll, the reading view and the budget all read it.
	 */
	function contentTop(): number {
		const header = document.querySelector<HTMLElement>('header.header');
		const bottom = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
		return Math.round(bottom) + PAGE_BUDGET.headerGap;
	}

	/** Each unit's page count, and each unit's pages: what pager.ts reads */
	function pageCounts(): number[] {
		return units.map((unit) => unit.pages.length);
	}
	function unitPages(): PageRange[][] {
		return units.map((unit) => unit.pages);
	}


	function contentRoot(): HTMLElement | null {
		if (!container) return null;
		return (
			container.querySelector<HTMLElement>('article.cnx-module') ??
			container.querySelector<HTMLElement>('.reading-content') ??
			container
		);
	}

	/** A block's height with both its margins, and the margins, which paginate() collapses with a
	 *  neighbour's as CSS does (S9.5, CODE-28) */
	function measure(el: HTMLElement): { height: number; marginTop: number; marginBottom: number } {
		const rect = el.getBoundingClientRect();
		const style = getComputedStyle(el);
		const marginTop = parseFloat(style.marginTop) || 0;
		const marginBottom = parseFloat(style.marginBottom) || 0;
		return { height: rect.height + marginTop + marginBottom, marginTop, marginBottom };
	}

	function buildUnits(root: HTMLElement): Unit[] {
		return buildContentUnits(root).map((unit) => ({ ...unit, cuts: [], pieces: [], pages: [] }));
	}

	/** The height of a block's part before its cut, margin above included */
	function firstPartHeight(el: HTMLElement, cut: Element): number {
		const marginTop = parseFloat(getComputedStyle(el).marginTop) || 0;
		return cut.getBoundingClientRect().top - el.getBoundingClientRect().top + marginTop;
	}

	function computePages() {
		const first = units[0]?.children[0];
		const gap = () =>
			container && first ? Math.max(0, first.getBoundingClientRect().top - container.getBoundingClientRect().top) : 0;
		gapAbove = gap();
		// The notice's share of the chrome: measured by hiding it once, here in the restored
		// layout, where every block shows
		leadInset = 0;
		if (lead?.isConnected) {
			lead.setAttribute('hidden', '');
			leadInset = Math.max(0, gapAbove - gap());
			lead.removeAttribute('hidden');
		}
		const { page: viewportH, firstPage } = availableHeights();
		heights = { page: viewportH, firstPage };
		for (const [u, unit] of units.entries()) {
			unit.cuts = unit.children.map((el) => (EXAMPLE_BREAK_TRIAL ? exampleCut(el) : null));
			const items = unit.children.map((el, i) => {
				const cut = unit.cuts[i];
				return {
					...measure(el),
					...classifyBlock(el),
					firstPart: cut ? firstPartHeight(el, cut) : undefined
				};
			});
			unit.pieces = splitPieces(items, viewportH);
			unit.pages = paginate(unit.pieces, viewportH, u === 0 ? firstPage : viewportH);
			if (unit.pages.length === 0) {
				unit.pages = [{ start: 0, end: unit.pieces.length }];
			}
		}
		flatPages = units.flatMap((unit, u) => unit.pages.map((_, p) => ({ unit: u, page: p })));
	}

	/** Children of a broken example that the pager hid; only these does it show again, so
	 *  what practiceReveal hides (the answer, the self-assessment row) stays its own */
	const partHidden = new Set<Element>();

	/** Show one part of a broken block: hide its children before the cut, or from it */
	function showPart(el: HTMLElement, cut: Element, part: BlockPart) {
		let fromCut = false;
		for (const child of Array.from(el.children)) {
			if (child === cut) fromCut = true;
			const hide = part === 'first' ? fromCut : part === 'second' ? !fromCut : false;
			if (hide && !child.hasAttribute('hidden')) {
				child.setAttribute('hidden', '');
				partHidden.add(child);
			} else if (!hide && partHidden.has(child)) {
				child.removeAttribute('hidden');
				partHidden.delete(child);
			}
		}
	}

	function restoreAll() {
		lead?.removeAttribute('hidden');
		for (const unit of units) {
			unit.wrapper?.removeAttribute('hidden');
			for (const el of unit.children) el.removeAttribute('hidden');
		}
		for (const child of partHidden) child.removeAttribute('hidden');
		partHidden.clear();
	}

	function applyVisibility() {
		const flat = flatPages[current];
		if (!flat) return;
		// The notice stands above the section's first page only (S9.4, UI-09)
		lead?.toggleAttribute('hidden', current !== 0);

		for (let u = 0; u < units.length; u++) {
			const unit = units[u];
			// Covered by the section's end, no unit is shown, so every block is hidden
			const isCurrent = u === flat.unit && !covered;
			if (unit.wrapper) {
				unit.wrapper.toggleAttribute('hidden', !isCurrent);
			}
			if (isCurrent) {
				unit.wrapper?.removeAttribute('hidden');
				const shown = shownParts(unit.pieces, unit.pages[flat.page]);
				unit.children.forEach((el, i) => {
					const part = shown.get(i);
					el.toggleAttribute('hidden', part === undefined);
					const cut = unit.cuts[i];
					if (cut && part) showPart(el, cut, part);
				});
			} else if (!unit.wrapper) {
				for (const el of unit.children) el.setAttribute('hidden', '');
			}
		}
	}

	/**
	 * The block the page on screen starts with, for the section page to keep in view across a
	 * switch to scrolling (S9.3, CODE-07): its first block, or for the second part of a broken
	 * worked example the child it breaks before, since the block's own top is the first part's.
	 * Null when no page is shown.
	 */
	export function shownAnchor(): HTMLElement | null {
		const flat = flatPages[current];
		const unit = flat && units[flat.unit];
		const range = unit?.pages[flat.page];
		const piece = range && unit.pieces[range.start];
		if (!piece) return null;
		const cut = unit.cuts[piece.block];
		return piece.part === 'second' && cut instanceof HTMLElement ? cut : unit.children[piece.block];
	}

	/** The blocks a page shows, in order: one per piece, a broken block once */
	function pageBlocks(unit: Unit, range: PageRange): HTMLElement[] {
		const blocks = unit.pieces.slice(range.start, range.end).map((piece) => unit.children[piece.block]);
		return blocks.filter((el, i) => blocks.indexOf(el) === i);
	}

	/** The room asked of the section page so far; it only grows within a visit. Not $state. */
	let reserve = 0;

	function scrollToContentTop() {
		if (!container) return;
		const target = contentTop();
		window.scrollTo({ top: Math.max(0, container.getBoundingClientRect().top + window.scrollY - target), behavior: 'instant' });
		// A document too short to bring the content top under the header (a short page, often the
		// first, under the objectives) left the page lower than budgeted, and its controls with it.
		// Ask the section page for that much room at its end, and scroll again once it is there
		// (S9.5; UI-19's arrival shortfall, which the measured content top made bite). Only with
		// a real layout: jsdom has none.
		if (!onreserve || document.documentElement.scrollHeight <= window.innerHeight) return;
		const short = Math.round(container.getBoundingClientRect().top - target);
		if (short <= 1) return;
		reserve += short;
		onreserve(reserve);
		const signal = run?.signal;
		tick().then(() => {
			if (signal?.aborted || !container) return;
			window.scrollTo({
				top: Math.max(0, container.getBoundingClientRect().top + window.scrollY - contentTop()),
				behavior: 'instant'
			});
		});
	}

	function updateHash() {
		const flat = flatPages[current];
		if (!flat) return;
		const hash = encodePageHash(flat) || window.location.pathname + window.location.search;
		try {
			history.replaceState(history.state, '', hash);
		} catch {
			/* history can throw in exotic embeddings; hash is cosmetic */
		}
	}

	/** Announce the position the label shows, counted per sub-section as the label is (it
	 *  once counted flat pages over the whole section, QA E19), with the sub-section named
	 *  since S9.2 (UI-05). The effect below passes a change on to the app's one polite region. */
	function announce() {
		const f = flatPages[current];
		announcement = f ? spokenPosition(f, pageCounts(), unitHeading(units[f.unit]?.wrapper ?? null)) : '';
	}

	/** `keepHash` leaves an element deep link (#CNX_…) in the URL, so a reload
	 *  or a re-split can find the target again (QA E8). */
	function showPage(index: number, { scroll = true, keepHash = false } = {}) {
		current = Math.max(0, Math.min(index, flatPages.length - 1));
		applyVisibility();
		// This part's images and the next part's, ahead of the reader (S9.4, CODE-15)
		const shownUnit = flatPages[current]?.unit;
		if (shownUnit !== undefined) loadUnitImages(shownUnit);
		if (!keepHash) updateHash();
		announce();
		if (scroll) scrollToContentTop();
		report();
		// Once the label row for this page has rendered, check it fits the reserve (S9.5)
		if (live) {
			const signal = run?.signal;
			tick().then(() => {
				if (signal?.aborted) return;
				calibrate({ growOnly: true });
				// Counted for a turn or an arrival (the calls that scroll), not a re-split of the
				// page already shown
				if (!scroll) return;
				const span = pageSpan();
				const view = readingView();
				if (span.bottom - span.top > view.bottom - view.top + KEY_SCROLL.tolerance) ontallpage?.();
			});
		}
	}

	function markUnitComplete(unitIndex: number) {
		if (completedUnits.has(unitIndex)) return;
		completedUnits.add(unitIndex);
		onsubsectioncomplete?.(unitIndex);
	}

	/** Advancing past the last page finishes the section, as reaching the end
	 *  does in scrolled mode, even when the reader skipped sub-sections (came in
	 *  by a link to a later one). It used to need every sub-section paged
	 *  through, which left that reader a "Næsta" that did nothing and no
	 *  recall prompt ([USER], 2026-10-04). */
	function completeSection() {
		if (completionFired) return;
		completionFired = true;
		report();
		oncomplete?.();
	}

	/** Turn to the next page, or finish the section from the last; true when a page turned */
	function next(): boolean {
		if (!ready || failed || !flatPages[current]) return false;
		target = null;
		const step = stepNext(current, pageCounts(), { section: completionFired, units: completedUnits });
		// Leaving a sub-section's last page reports it once, through onsubsectioncomplete
		if (step.unitComplete !== null) markUnitComplete(step.unitComplete);
		if (step.index !== null) {
			showPage(step.index);
			return true;
		}
		if (step.sectionComplete) completeSection();
		return false;
	}

	/** Turn to the previous page; true when a page turned. While covered, ask the page to show
	 *  the page again instead (UI-21). */
	function prev(): boolean {
		if (!ready || failed) return false;
		if (covered) {
			onuncover?.();
			return false;
		}
		target = null;
		const index = stepPrev(current, pageCounts());
		if (index === null) return false;
		showPage(index);
		return true;
	}

	/** The article while the pager has given it a tabindex, so a failure or teardown can take
	 *  it back. Not $state. */
	let focusedArticle: HTMLElement | null = null;

	/**
	 * Focus the article for the moment, as TextHighlighter's focusArticle() does: it holds
	 * tabindex="-1" only until it loses focus, since a standing tabindex would make every
	 * click in the text move the Tab order back to its top.
	 */
	function focusArticle() {
		const root = contentRoot();
		if (!root) return;
		if (!root.hasAttribute('tabindex')) {
			root.setAttribute('tabindex', '-1');
			focusedArticle = root;
			// The run's signal, like every listener the pager adds (CODE-17)
			root.addEventListener('blur', releaseArticle, { once: true, signal: run?.signal });
		}
		root.focus({ preventScroll: true });
	}

	/** Take back the tabindex focusArticle() gave */
	function releaseArticle() {
		focusedArticle?.removeEventListener('blur', releaseArticle);
		focusedArticle?.removeAttribute('tabindex');
		focusedArticle = null;
	}

	/**
	 * After a key or swipe turn (S9.2, UI-01): focus left in a block the turn hid, or on
	 * <body>, goes to the article, so it is never on a hidden element and a screen reader
	 * goes on from the page. Focus anywhere else stays, so 'Fyrri' and 'Næsta' keep theirs
	 * for repeated presses (reader plan line 209).
	 */
	function keepFocusOnPage() {
		const active = document.activeElement;
		if (active && active !== document.body && !active.closest('[hidden]')) return;
		focusArticle();
	}

	function resolveHash(hash: string): number | null {
		const page = resolvePageHash(hash, pageCounts());
		if (page !== null) return page;
		// Element deep link (cross-references, figure/equation anchors);
		// elementForHash returns null for any '#sub-<digits>' hash
		const el = elementForHash(hash);
		return el ? pageForElement(el) : null;
	}

	/** The block an element is or sits in, or null when it is in no unit */
	/** The piece an element is or sits in, or null when it is in no unit. In a broken
	 *  example, an element at or after the cut is in the second part (D11's trial). */
	function itemForElement(el: HTMLElement): ItemPosition | null {
		for (let u = 0; u < units.length; u++) {
			const block = itemIndexForTarget(units[u].children, el);
			if (block < 0) continue;
			const cut = units[u].cuts[block];
			const fromCut =
				!!cut && (el === cut || !!(cut.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING));
			return { unit: u, item: pieceOf(units[u].pieces, block, fromCut ? 'second' : 'first') };
		}
		return null;
	}

	function pageForElement(el: HTMLElement): number | null {
		const at = itemForElement(el);
		return at ? flatIndexForItem(at, unitPages()) : null;
	}

	/** The element an element deep link points at, or null for #sub-… and none */
	function elementForHash(hash: string): HTMLElement | null {
		if (hash.length <= 1 || /^#sub-\d+/.test(hash)) return null;
		try {
			return contentRoot()?.querySelector<HTMLElement>(`#${CSS.escape(hash.slice(1))}`) ?? null;
		} catch {
			return null;
		}
	}

	/** The part of the window a page is read in: below where a turn puts the content's top,
	 *  above the bottom clearance the floating controls take */
	function readingView(): VerticalSpan {
		// Down to the docked bar's top when it is on screen: text under it is not read (S9.5)
		const barTop = navEl?.getBoundingClientRect().top ?? Infinity;
		return { top: contentTop(), bottom: Math.min(window.innerHeight - PAGE_BUDGET.bottomClearance, barTop) };
	}

	/** The page on screen, from its first block's top to its last block's bottom; the
	 *  reading view itself when it shows no block, so a key turns */
	function pageSpan(): VerticalSpan {
		const flat = flatPages[current];
		const unit = flat ? units[flat.unit] : undefined;
		const range = flat && unit ? unit.pages[flat.page] : undefined;
		const rects = (range && unit ? pageBlocks(unit, range) : [])
			.map((el) => el.getBoundingClientRect())
			.filter((rect) => rect.height > 0);
		if (rects.length === 0) return readingView();
		return {
			top: Math.min(...rects.map((rect) => rect.top)),
			bottom: Math.max(...rects.map((rect) => rect.bottom))
		};
	}

	function handleKeyDown(event: KeyboardEvent) {
		// Getters, so each is read only when keyAction needs it, in v1.1's order
		const turn = keyAction(event, {
			get typing() {
				return isTyping();
			},
			get belongsElsewhere() {
				return keyBelongsElsewhere(event);
			},
			// Space presses a focused control (Fyrri, "Sýna svar", a glossary term)
			get focusOnControl() {
				return !!document.activeElement?.closest('button, a[href], summary, [role="button"]');
			}
		});
		if (!turn) return;
		event.preventDefault();
		// D11: Space and PageDown scroll a page taller than the window before they turn it
		const distance = keyScroll(event.key, turn, pageSpan(), readingView());
		if (distance !== 0) window.scrollBy({ top: distance });
		else if (turn === 'next' ? next() : prev()) keepFocusOnPage();
	}

	let touchStartX = 0;
	let touchStartY = 0;
	/** A second finger was down during this gesture; reset by the next one-finger touch */
	let multiTouch = false;
	/** This gesture began inside a box that scrolls sideways */
	let inSidewaysBox = false;

	/** Whether a touch began inside a box that scrolls sideways, up to the content wrapper */
	function startsInSidewaysBox(target: EventTarget | null): boolean {
		for (let el = target instanceof Element ? target : null; el && el !== container; el = el.parentElement) {
			if (scrollsSideways(el)) return true;
		}
		return false;
	}

	function handleTouchStart(event: TouchEvent) {
		// A second finger's touchstart must not move the start point (CODE-09)
		if (event.touches.length > 1) {
			multiTouch = true;
			return;
		}
		multiTouch = false;
		touchStartX = event.changedTouches[0].clientX;
		touchStartY = event.changedTouches[0].clientY;
		inSidewaysBox = startsInSidewaysBox(event.target);
	}
	function handleTouchEnd(event: TouchEvent) {
		const dx = event.changedTouches[0].clientX - touchStartX;
		const dy = event.changedTouches[0].clientY - touchStartY;
		// Horizontal swipes only; leave vertical gestures, pinches, selection drags and
		// drags that scroll a wide box to the browser (S9.1, CODE-09)
		const turn = swipeAction(dx, dy, {
			multiTouch: multiTouch || event.touches.length > 0,
			selecting: !(window.getSelection()?.isCollapsed ?? true),
			inSidewaysBox
		});
		if (turn && (turn === 'next' ? next() : prev())) keepFocusOnPage();
	}

	/**
	 * An in-text 'Mynd' link opens the figure in the lightbox over the current page (S9.4, PED-03;
	 * D12 keeps no figure with its citation), so the reader keeps their page and their place.
	 * Any other in-page link (a table, a note, an equation) keeps the page jump. Handled before
	 * SvelteKit's own link handler, which returns on a prevented click.
	 */
	function handleContentClick(event: MouseEvent) {
		if (!ready || failed || event.defaultPrevented || event.button !== 0) return;
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href^="#"]') : null;
		if (!link) return;
		const target = elementForHash(link.getAttribute('href') ?? '');
		const img = target?.matches('figure') ? target.querySelector('img') : null;
		if (!img) return;
		event.preventDefault();
		openFigure(img, link);
	}

	function handleHashChange() {
		if (!ready || failed) return;
		const hash = window.location.hash;
		const idx = resolveHash(hash);
		target = elementForHash(hash);
		if (idx !== null && idx !== current) {
			showPage(idx, { keepHash: target !== null });
		}
	}

	function scheduleRecompute() {
		clearTimeout(recomputeTimer);
		recomputeTimer = setTimeout(() => recompute(), 150);
	}

	/** Re-measure and re-split, keeping the reader within ±1 page of the
	 *  block they were looking at (font size, resize, late image loads) */
	function recompute() {
		if (!ready || failed) return;
		// Covered, nothing of the page is on screen: re-split once it shows again, so the label
		// does not change behind the section's end (a rotation, a split screen; UI-21)
		if (covered) {
			resplitWhenUncovered = true;
			return;
		}
		try {
			const before = pageAnchor(flatPages[current], unitPages());
			// Kept as a block and its part: a re-split can break or join an example, which
			// renumbers the pieces after it
			const held = before ? units[before.unit]?.pieces[before.item] : undefined;

			restoreAll();
			const root = contentRoot();
			if (!root) return;
			units = buildUnits(root);
			computePages();
			const anchor =
				before && held && units[before.unit]
					? { unit: before.unit, item: pieceOf(units[before.unit].pieces, held.block, held.part) }
					: null;

			// A deep-link target outranks the page's first block: a late image
			// can push the target onto the next page, which used to hide it
			// ~100ms after landing (QA E8)
			// A target that has left the document (its content was replaced) can no longer hold a page
			if (target && !target.isConnected) target = null;
			const index = pageAfterResplit(
				{ target: target ? itemForElement(target) : null, anchor },
				unitPages()
			);
			showPage(index, { scroll: false, keepHash: target !== null });
		} catch (e) {
			console.warn('Paged mode recompute failed; falling back to scrolling:', e);
			fail();
		}
	}

	/** Give the section back to scrolling: show every block, forget the pages, tell the
	 *  page, and remove every listener this run added (CODE-17) */
	function fail() {
		failed = true;
		ready = false;
		releaseArticle();
		restoreAll();
		units = [];
		flatPages = [];
		report();
		run?.abort();
	}

	/**
	 * Load a part's images and the next part's (S9.4, CODE-15), returning those it set loading:
	 * content images carry no size yet (efni's H1), so one not loaded measures about 0 px, and a
	 * lazy image on a hidden page never loads until its page shows. Every figure in the section
	 * used to load at once (a median of about 2 MB on arrival, up to 25 MB). An image that carries
	 * its width and height keeps its box unloaded, so it stays lazy.
	 */
	function loadUnitImages(unit: number): HTMLImageElement[] {
		const started: HTMLImageElement[] = [];
		for (const u of [unit, unit + 1]) {
			for (const block of units[u]?.children ?? []) {
				const images = block instanceof HTMLImageElement ? [block] : Array.from(block.querySelectorAll('img'));
				for (const img of images) {
					if (img.getAttribute('loading') === 'eager') continue;
					if (img.hasAttribute('width') && img.hasAttribute('height')) continue;
					img.setAttribute('loading', 'eager');
					started.push(img);
				}
			}
		}
		return started;
	}

	/** The part a reader arrives in: where they switched from, the address's page or element, or the first */
	function arrivalUnit(): number {
		const inUnit = (el: HTMLElement | null) => {
			const u = el ? units.findIndex((unit) => itemIndexForTarget(unit.children, el) >= 0) : -1;
			return u >= 0 ? u : null;
		};
		const fromStart = startAt?.isConnected ? inUnit(startAt) : null;
		if (fromStart !== null) return fromStart;
		const page = decodePageHash(window.location.hash);
		if (page) return Math.min(page.unit, Math.max(0, units.length - 1));
		return inUnit(elementForHash(window.location.hash)) ?? 0;
	}

	/** Load the arrival part's images and the next part's, and wait briefly for them */
	async function loadArrivalImages() {
		const started = loadUnitImages(arrivalUnit());
		const settled = Promise.all(
			started.filter((img) => !img.complete).map((img) => img.decode().catch(() => undefined))
		);
		await Promise.race([settled, new Promise((r) => setTimeout(r, IMAGE_WAIT_MS))]);
	}

	/** Measure the real gap between the last block and the bottom of the page
	 *  controls, now that they exist, and re-split if the estimate was off. */
	/**
	 * Measure the gap between the last block and the bottom of the page controls on the page
	 * shown, and re-split if the estimate was off. From the last block's bottom margin edge: that
	 * margin is already in the page's height (pageHeight()). At init it corrects the estimate
	 * either way; after a turn it only grows it (`growOnly`), since the label row wraps to a
	 * different height on different pages (at 375 px, 'Síða 14 af 27' takes a line more than
	 * 'Síða 1 af 27'), and a page whose row is taller than the one measured overran by the
	 * difference (S9.5). It re-splits at most once for each new, taller row.
	 */
	function calibrate({ growOnly = false } = {}) {
		if (!navEl || !ready) return;
		const shown = flatPages[current] && units[flatPages[current].unit];
		const range = shown && shown.pages[flatPages[current].page];
		const last = range && pageBlocks(shown, range).at(-1);
		if (!last) return;
		const lastEdge = last.getBoundingClientRect().bottom + (parseFloat(getComputedStyle(last).marginBottom) || 0);
		// From the bar's place in the flow, not its rect: docked, it sticks to the window's bottom
		// when a page runs past it, and its rect then says nothing about the gap (S9.5). It follows
		// the container, with its own top margin and height; the recall prompt between them is
		// covered-only, when re-splits wait.
		const barTop = container ? container.getBoundingClientRect().bottom : navEl.getBoundingClientRect().top;
		const measured =
			barTop - lastEdge + (parseFloat(getComputedStyle(navEl).marginTop) || 0) + navEl.offsetHeight;
		if (!(measured > 0)) return;
		const off = measured - gapBelow;
		if (off > 8 || (!growOnly && off < -8)) {
			gapBelow = measured;
			recompute();
		}
	}

	async function init(el: HTMLElement, signal: AbortSignal) {
		try {
			// Heights are only stable once fonts are in; MathJax SVG is
			// pre-rendered and images recompute via their load events
			await document.fonts?.ready;
			await tick();
			// Destroyed or failed while waiting: its owner switched modes or left (CODE-17)
			if (signal.aborted) return;

			const root = contentRoot();
			if (!root || root.children.length === 0) {
				fail();
				return;
			}

			// Content images are lazy and carry no dimensions, so one not yet loaded measures
			// ~0px, and a lazy image on a hidden page never loads until that page is shown. Load
			// the arrival part's and the next part's now, wait briefly for them, and let any
			// straggler, or a later part's images as the reader reaches it, re-split through its
			// load event (S9.4, CODE-15).
			units = buildUnits(root);
			await loadArrivalImages();
			if (signal.aborted) return;

			units = buildUnits(root);
			computePages();
			if (flatPages.length === 0) {
				fail();
				return;
			}
			ready = true;

			// Where the reader was when they switched to paged outranks the address (S9.3)
			const fromStart = startAt?.isConnected ? pageForElement(startAt) : null;
			const fromHash = fromStart ?? resolveHash(window.location.hash);
			target = fromStart === null ? elementForHash(window.location.hash) : null;
			// Scroll to the content on arrival too, past the learning objectives
			// above it, so page 1 gets a whole page ([USER], 2026-10-04). Sizing
			// page 1 to the room under the objectives left 5.3 at 1280x720 with
			// the title alone and its controls below the fold.
			showPage(fromHash ?? 0, { keepHash: target !== null });
			await tick();
			if (signal.aborted) return;
			calibrate();
			// calibrate() re-splits, and a re-split can fail
			if (signal.aborted) return;

			// Late-loading images change heights — recompute around them
			root.addEventListener('load', () => scheduleRecompute(), { capture: true, signal });

			// On a touch screen the URL bar showing or hiding changes only the
			// height, by well under 120px; re-splitting for it would move the
			// page count mid-read. Width changes and real height changes re-split.
			const touch = window.matchMedia('(pointer: coarse)').matches;
			let lastW = window.innerWidth;
			let lastH = window.innerHeight;
			const onResize = () => {
				const w = window.innerWidth;
				const h = window.innerHeight;
				if (touch && w === lastW && Math.abs(h - lastH) < 120) return;
				lastW = w;
				lastH = h;
				scheduleRecompute();
			};
			window.addEventListener('resize', onResize, { signal });
			window.addEventListener('keydown', handleKeyDown, { signal });
			window.addEventListener('hashchange', handleHashChange, { signal });
			root.addEventListener('click', handleContentClick, { signal });
			el.addEventListener('touchstart', handleTouchStart, { passive: true, signal });
			el.addEventListener('touchend', handleTouchEnd, { passive: true, signal });
			signal.addEventListener('abort', () => clearTimeout(recomputeTimer), { once: true });

			// Typography settings change block heights
			let firstSettings = true;
			const unsubscribe = settings.subscribe(() => {
				if (firstSettings) {
					firstSettings = false;
					return;
				}
				scheduleRecompute();
			});
			signal.addEventListener('abort', unsubscribe, { once: true });

			// Re-split if a direct child of the content root is added or removed. With efni's
			// markup those are the header and the body (sometimes a section after it), so this
			// rarely fires. Bionic reading wraps and unwraps text in place and never triggers
			// it; the settings subscription above re-splits for that. Whether to keep it is
			// CODE-27's question (M11).
			const observer = new MutationObserver(() => scheduleRecompute());
			observer.observe(root, { childList: true });
			signal.addEventListener('abort', () => observer.disconnect(), { once: true });

			live = true;
			report();
		} catch (e) {
			// A run its owner already ended has nothing to give back: its fail() would report
			// 'failed' for a pager that is gone and abort the run that replaced it
			if (signal.aborted) return;
			console.warn('Paged mode init failed; falling back to scrolling:', e);
			fail();
		}
	}

	$effect(() => {
		const el = container;
		if (!browser || !el) return;

		const controller = new AbortController();
		run = controller;
		failed = false;
		completionFired = false;
		completedUnits.clear();
		live = false;
		reported = null;
		appliedCovered = false;
		resplitWhenUncovered = false;
		reserve = 0;
		// untrack: report() reads $state, which must not become this effect's dependencies
		untrack(report);
		init(el, controller.signal);

		return () => {
			controller.abort();
			clearTimeout(recomputeTimer);
			releaseArticle();
			restoreAll();
			units = [];
			flatPages = [];
			ready = false;
		};
	});

	// The position is spoken through the app's one polite region (LiveAnnouncer; plan
	// step S8.3, register UI-01), so the pager's own region no longer competes with it.
	// Only a change is spoken, as from that region: setting `announcement` to the text
	// it holds changes nothing, so a re-split that keeps the page is silent. When the
	// pager fails or goes, it takes its text back, so the region never describes pages
	// that are not on screen; text announced later stays. But an announcement still
	// pending (announce() leaves the region empty for 50 ms first) is cancelled too,
	// whoever made it: the region cannot tell them apart. So code that turns paging off
	// and announces should announce after the flush (after `await tick()`). The exact
	// fix is cancelling by owner in announcer.ts, after S4.5.
	$effect(() => {
		const text = ready && !failed ? announcement : '';
		if (!text) return;
		speak(text);
		return () => {
			const now = get(liveText);
			if (now === text || now === '') speak('');
		};
	});

	// The section's end covering the page (S9.3, UI-21): hide the page and bring the content top
	// into view, as a turn does; uncovered, show the page again and run any re-split held back
	$effect(() => {
		const now = covered;
		if (!ready || failed || now === appliedCovered) return;
		appliedCovered = now;
		untrack(() => {
			applyVisibility();
			if (now) scrollToContentTop();
			else if (resplitWhenUncovered) {
				resplitWhenUncovered = false;
				recompute();
			}
		});
	});

	let flat = $derived(flatPages[current]);
	/** The last page of the section, whose button finishes it (ruling 3) */
	let lastPage = $derived(current === flatPages.length - 1);
	let label = $derived(flat ? positionLabel(flat, pageCounts()) : '');
</script>

{#if ready && !failed && flatPages.length > 0}
	<!-- 'Síðuflakk', 'Fyrri síða', 'Fyrri', 'Næsta síða' and 'Næsta', as v1.1 wrote them at
	     dde768e (S8.2); the label is pager.ts's positionLabel (S8.1). Checked by [USER] as D20
	     batch 9 (2026-11-04). -->
	<!-- The docked bar (S9.5; UI-12, [USER]'s layout of 2026-11-08): it sticks to the window's
	     bottom when a page runs past it, and keeps its ends free for the floating corner
	     controls (the tools button below 1024 px, the timer pill from 1024 px, a running timer
	     on the left below 1024 px; app.css hides the idle pill there while a section pages).
	     Below 640 px 'Fyrri' and 'Næsta' show their arrows only; their names are unchanged. -->
	<nav
		class="paged-nav"
		aria-label="Síðuflakk"
		bind:this={navEl}
		data-page-height={Math.round(heights.page)}
		data-first-page-height={Math.round(heights.firstPage)}
	>
		<div class="paged-nav-row">
			<button class="paged-nav-btn" onclick={prev} disabled={current === 0} aria-label="Fyrri síða">
				<Icon name="chevron-left" size="sm" />
				<span class="paged-nav-word">Fyrri</span>
			</button>

			<span class="paged-nav-label">
				{label}
			</span>

			<!-- On the last page the button finishes the section (ruling 3), so it says so (UI-20),
			     at every width: a check mark alone is too easy to misread for it.
			     'Ljúka kafla': Checked by [USER] as D20 batch 12 (2026-11-08). -->
			<button
				class="paged-nav-btn"
				onclick={next}
				disabled={lastPage && completionFired}
				aria-label={lastPage ? 'Ljúka kafla' : 'Næsta síða'}
			>
				{#if lastPage}
					Ljúka kafla
					<Icon name="check" size="sm" />
				{:else}
					<span class="paged-nav-word">Næsta</span>
					<Icon name="chevron-right" size="sm" />
				{/if}
			</button>
		</div>

		{#if mtReport || onleave}
			<div class="paged-nav-sub">
				{#if mtReport}
					<!-- The machine-translation notice on every page (S9.4; UI-09, PED-15): the banner's
					     own words, its name and sentence for screen readers, and its 'Tilkynna villu'.
					     No new strings. -->
					<span class="paged-nav-mt" role="note" aria-label="Vélþýtt efni">
						<Icon name="triangle-alert" size="sm" class="paged-nav-mt-icon" />
						<span>Vélþýtt<span class="sr-only">
								efni. Þessi eining hefur ekki enn verið yfirlesin og kann að innihalda þýðingarvillur.</span
							></span>
						<a class="paged-nav-mt-report" href={mtReport}>Tilkynna villu</a>
					</span>
				{/if}
				{#if onleave}
					<!-- The in-view way out (S9.3, UI-05, PED-01), the toolbar's 'Samfellt skrun' again;
					     v1.1's Lestrarstilling label. Checked by [USER] as D20 batch 12 (2026-11-08). -->
					<button class="paged-nav-leave" aria-pressed="false" onclick={() => onleave?.()}>Samfellt skrun</button>
				{/if}
			</div>
		{/if}
	</nav>

{/if}

<style>
	/* The docked bar. Its background hides the text it sticks over; z-index 30 keeps it under
	   the corner controls (40), whose places its padding keeps free. */
	.paged-nav {
		position: sticky;
		bottom: 0;
		z-index: 30;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-top: 1.5rem;
		padding: 0.5rem 0;
		border-top: 1px solid var(--border-color);
		background-color: var(--bg-primary);
	}

	/* Below 1024 px the tools button's corner (16 px + 48 px + 8 px) */
	@media (max-width: 1023px) {
		.paged-nav {
			padding-right: 72px;
		}
	}

	/* From 1024 px the timer pill's corner (24 px + 76 px + 8 px), and its height */
	@media (min-width: 1024px) {
		.paged-nav {
			padding-right: 108px;
			min-height: 4.5rem;
		}
	}

	.paged-nav-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.paged-nav-sub {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		column-gap: 1rem;
	}

	/* Below 640 px the arrows alone ([USER], 2026-11-08); the names stay the buttons' names */
	@media (max-width: 639px) {
		.paged-nav-word {
			display: none;
		}
	}

	.paged-nav-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 1rem;
		border-radius: 0.625rem;
		border: 1px solid var(--border-color);
		background-color: var(--bg-secondary);
		color: var(--text-primary);
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.15s;
	}

	.paged-nav-btn:hover:not(:disabled) {
		border-color: var(--accent-color);
		background-color: var(--accent-light);
	}

	.paged-nav-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* A quiet text button: the way out is there, not loud. Bronze text, underlined on hover
	   (the accent-text rule), never white on amber. */
	.paged-nav-leave {
		padding: 0.25rem 0.5rem;
		font-size: 0.8125rem;
		color: var(--accent-strong);
		text-underline-offset: 2px;
	}

	.paged-nav-leave:hover {
		text-decoration: underline;
	}

	.paged-nav-mt {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}

	/* The banner's amber, as decoration only */
	:global(.paged-nav-mt-icon) {
		color: #d97706;
	}

	/* Bronze text for amber-as-text, underlined, as the banner's link (the accent-text rule).
	   Centred: on touch screens app.css gives every link 44 px of height, and its text sat at
	   the top, above 'Vélþýtt'. */
	.paged-nav-mt-report {
		display: inline-flex;
		align-items: center;
		color: var(--accent-strong);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.paged-nav-label {
		flex: 1;
		font-size: 0.8125rem;
		/* --text-secondary: v1.1 moved off --text-tertiary when that was 2.90:1 (QA E18).
		   Both pass AA since S2.1 (tokens.test.ts); the position is information, not a hint. */
		color: var(--text-secondary);
		text-align: center;
	}
</style>
