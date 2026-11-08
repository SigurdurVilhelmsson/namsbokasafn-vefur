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
		type BlockPart,
		type PageRange,
		type Piece
	} from '$lib/utils/paginate';
	import {
		PAGE_BUDGET,
		pageBudget,
		encodePageHash,
		resolvePageHash,
		positionLabel,
		keyAction,
		swipeAction,
		stepNext,
		stepPrev,
		pageAnchor,
		pageAfterResplit,
		flatIndexForItem,
		pagerState,
		keyScroll,
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
	}

	let { container, oncomplete, onsubsectioncomplete, onstatechange }: Props = $props();

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

	/** The deep-link / cross-reference target the reader was sent to. While set,
	 *  a re-split keeps its page on screen; any page turn clears it. */
	let target: HTMLElement | null = null;

	/** Reading height of a page, scrolled to the content top. It used to be the
	 *  viewport minus a fixed 260px; the real chrome is larger (QA E1). */
	function availableHeight(): number {
		return pageBudget({ innerHeight: window.innerHeight, gapAbove, gapBelow });
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

	function measure(el: HTMLElement): number {
		const rect = el.getBoundingClientRect();
		const style = getComputedStyle(el);
		return rect.height + (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0);
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
		if (container && first) {
			gapAbove = Math.max(0, first.getBoundingClientRect().top - container.getBoundingClientRect().top);
		}
		const viewportH = availableHeight();
		for (const unit of units) {
			unit.cuts = unit.children.map((el) => (EXAMPLE_BREAK_TRIAL ? exampleCut(el) : null));
			const items = unit.children.map((el, i) => {
				const cut = unit.cuts[i];
				return {
					height: measure(el),
					...classifyBlock(el),
					firstPart: cut ? firstPartHeight(el, cut) : undefined
				};
			});
			unit.pieces = splitPieces(items, viewportH);
			unit.pages = paginate(unit.pieces, viewportH);
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

		for (let u = 0; u < units.length; u++) {
			const unit = units[u];
			const isCurrent = u === flat.unit;
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

	/** The blocks a page shows, in order: one per piece, a broken block once */
	function pageBlocks(unit: Unit, range: PageRange): HTMLElement[] {
		const blocks = unit.pieces.slice(range.start, range.end).map((piece) => unit.children[piece.block]);
		return blocks.filter((el, i) => blocks.indexOf(el) === i);
	}

	function scrollToContentTop() {
		if (!container) return;
		const top = container.getBoundingClientRect().top + window.scrollY - PAGE_BUDGET.scrollOffset;
		window.scrollTo({ top: Math.max(0, top) });
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

	/** Announce what the label shows; it used to count flat pages over the
	 *  whole section while the label counted per sub-section (QA E19). The
	 *  effect below passes a change on to the app's one polite region. */
	function announce() {
		const f = flatPages[current];
		announcement = f ? positionLabel(f, pageCounts()) : '';
	}

	/** `keepHash` leaves an element deep link (#CNX_…) in the URL, so a reload
	 *  or a re-split can find the target again (QA E8). */
	function showPage(index: number, { scroll = true, keepHash = false } = {}) {
		current = Math.max(0, Math.min(index, flatPages.length - 1));
		applyVisibility();
		if (!keepHash) updateHash();
		announce();
		if (scroll) scrollToContentTop();
		report();
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

	/** Turn to the previous page; true when a page turned */
	function prev(): boolean {
		if (!ready || failed) return false;
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
			root.addEventListener('blur', releaseArticle, { once: true });
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
		return { top: PAGE_BUDGET.scrollOffset, bottom: window.innerHeight - PAGE_BUDGET.bottomClearance };
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

	async function loadImages(root: HTMLElement) {
		const images = Array.from(root.querySelectorAll('img'));
		for (const img of images) img.loading = 'eager';
		const settled = Promise.all(
			images.filter((img) => !img.complete).map((img) => img.decode().catch(() => undefined))
		);
		await Promise.race([settled, new Promise((r) => setTimeout(r, IMAGE_WAIT_MS))]);
	}

	/** Measure the real gap between the last block and the bottom of the page
	 *  controls, now that they exist, and re-split if the estimate was off. */
	function calibrate() {
		if (!navEl || !ready) return;
		const shown = flatPages[current] && units[flatPages[current].unit];
		const range = shown && shown.pages[flatPages[current].page];
		const last = range && pageBlocks(shown, range).at(-1);
		if (!last) return;
		const measured = navEl.getBoundingClientRect().bottom - last.getBoundingClientRect().bottom;
		if (measured > 0 && Math.abs(measured - gapBelow) > 8) {
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

			// Content images are lazy and carry no dimensions, so one not yet
			// loaded measures ~0px; and a lazy image on a hidden page never
			// loads until that page is shown. Load them all now, wait briefly
			// for them, and let any straggler re-split through its load event.
			await loadImages(root);
			if (signal.aborted) return;

			units = buildUnits(root);
			computePages();
			if (flatPages.length === 0) {
				fail();
				return;
			}
			ready = true;

			const fromHash = resolveHash(window.location.hash);
			target = elementForHash(window.location.hash);
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

	let flat = $derived(flatPages[current]);
	let label = $derived(flat ? positionLabel(flat, pageCounts()) : '');
</script>

{#if ready && !failed && flatPages.length > 0}
	<!-- 'Síðuflakk', 'Fyrri síða', 'Fyrri', 'Næsta síða' and 'Næsta', as v1.1 wrote them at
	     dde768e (S8.2); the label is pager.ts's positionLabel (S8.1). Checked by [USER] as D20
	     batch 9 (2026-11-04). -->
	<nav class="paged-nav" aria-label="Síðuflakk" bind:this={navEl}>
		<button class="paged-nav-btn" onclick={prev} disabled={current === 0} aria-label="Fyrri síða">
			<Icon name="chevron-left" size="sm" />
			Fyrri
		</button>

		<span class="paged-nav-label">
			{label}
		</span>

		<button
			class="paged-nav-btn"
			onclick={next}
			disabled={current === flatPages.length - 1 && completionFired}
			aria-label="Næsta síða"
		>
			Næsta
			<Icon name="chevron-right" size="sm" />
		</button>
	</nav>

{/if}

<style>
	.paged-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-top: 1.5rem;
		padding: 0.5rem 0;
		border-top: 1px solid var(--border-color);
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

	.paged-nav-label {
		font-size: 0.8125rem;
		/* --text-secondary: v1.1 moved off --text-tertiary when that was 2.90:1 (QA E18).
		   Both pass AA since S2.1 (tokens.test.ts); the position is information, not a hint. */
		color: var(--text-secondary);
		text-align: center;
	}
</style>
