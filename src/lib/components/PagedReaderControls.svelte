<!--
  PagedReaderControls - Hybrid viewport-aware pagination (reader plan P0.4)

  Outer level: the sub-section boundaries already present in the prerendered
  HTML (article.cnx-module > main > section, or efni's planned .cnx-body in
  place of main; buildUnits and MODULE_BODY_SELECTOR in utils/paginate.ts).
  Inner level: viewport-fitting page splits computed by utils/paginate.ts over
  measured block heights.

  Pages are applied by HIDING out-of-page blocks rather than moving them:
  the DOM the content actions (practiceProblems, glossaryTerms, ...) enhanced
  stays intact, so their listeners survive page turns. Restoring visibility
  (mode switch, destroy, failure) returns the exact scrolled experience.
-->
<script lang="ts">
	import { tick } from 'svelte';
	import { get } from 'svelte/store';
	import Icon from '$lib/components/Icon.svelte';
	import { browser } from '$app/environment';
	import { settings } from '$lib/stores/settings';
	// Aliased: the component has its own announce() and announcement
	import { announce as speak, announcement as liveText } from '$lib/stores/announcer';
	import { keyBelongsElsewhere } from '$lib/actions/keyboardShortcuts';
	import {
		paginate,
		buildUnits as buildContentUnits,
		itemIndexForTarget,
		classifyBlock,
		type PageRange
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
		type ItemPosition
	} from '$lib/utils/pager';

	interface Props {
		/** Wrapper around the rendered content (contains .reading-content) */
		container: HTMLElement | undefined;
		/** Fired when the reader advances past the last page of the last
		 *  sub-section — the paged-mode equivalent of "scrolled to the end" */
		oncomplete?: () => void;
		/** Fired when a sub-section's last page is advanced past */
		onsubsectioncomplete?: (index: number) => void;
	}

	let { container, oncomplete, onsubsectioncomplete }: Props = $props();

	interface Unit {
		wrapper: HTMLElement | null; // the <section>, or null for intro content
		children: HTMLElement[];
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

	let cleanups: (() => void)[] = [];
	let recomputeTimer: ReturnType<typeof setTimeout> | undefined;
	let observer: MutationObserver | undefined;
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

	function isTyping(): boolean {
		const el = document.activeElement;
		if (!el) return false;
		const tag = el.tagName;
		return (
			tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el as HTMLElement).isContentEditable
		);
	}

	function measure(el: HTMLElement): number {
		const rect = el.getBoundingClientRect();
		const style = getComputedStyle(el);
		return rect.height + (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0);
	}

	function buildUnits(root: HTMLElement): Unit[] {
		return buildContentUnits(root).map((unit) => ({ ...unit, pages: [] }));
	}

	function computePages() {
		const first = units[0]?.children[0];
		if (container && first) {
			gapAbove = Math.max(0, first.getBoundingClientRect().top - container.getBoundingClientRect().top);
		}
		const viewportH = availableHeight();
		for (const unit of units) {
			const items = unit.children.map((el) => ({
				height: measure(el),
				...classifyBlock(el)
			}));
			unit.pages = paginate(items, viewportH);
			if (unit.pages.length === 0) {
				unit.pages = [{ start: 0, end: unit.children.length }];
			}
		}
		flatPages = units.flatMap((unit, u) => unit.pages.map((_, p) => ({ unit: u, page: p })));
	}

	function restoreAll() {
		for (const unit of units) {
			unit.wrapper?.removeAttribute('hidden');
			for (const el of unit.children) el.removeAttribute('hidden');
		}
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
				const range = unit.pages[flat.page];
				unit.children.forEach((el, i) => {
					el.toggleAttribute('hidden', i < range.start || i >= range.end);
				});
			} else if (!unit.wrapper) {
				for (const el of unit.children) el.setAttribute('hidden', '');
			}
		}
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
	 *  recall prompt (Siggi, 2026-10-04). */
	function completeSection() {
		if (completionFired) return;
		completionFired = true;
		oncomplete?.();
	}

	function next() {
		if (!flatPages[current]) return;
		target = null;
		const step = stepNext(current, pageCounts(), { section: completionFired, units: completedUnits });
		// Advancing past a sub-section's last page marks it read
		if (step.unitComplete !== null) markUnitComplete(step.unitComplete);
		if (step.index !== null) showPage(step.index);
		else if (step.sectionComplete) completeSection();
	}

	function prev() {
		target = null;
		const index = stepPrev(current, pageCounts());
		if (index !== null) showPage(index);
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
	function itemForElement(el: HTMLElement): ItemPosition | null {
		for (let u = 0; u < units.length; u++) {
			const item = itemIndexForTarget(units[u].children, el);
			if (item >= 0) return { unit: u, item };
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
		if (turn === 'next') next();
		else prev();
	}

	let touchStartX = 0;
	let touchStartY = 0;
	function handleTouchStart(event: TouchEvent) {
		touchStartX = event.changedTouches[0].clientX;
		touchStartY = event.changedTouches[0].clientY;
	}
	function handleTouchEnd(event: TouchEvent) {
		const dx = event.changedTouches[0].clientX - touchStartX;
		const dy = event.changedTouches[0].clientY - touchStartY;
		// Horizontal swipes only; leave vertical gestures to the browser
		const turn = swipeAction(dx, dy);
		if (turn === 'next') next();
		else if (turn === 'prev') prev();
	}

	function handleHashChange() {
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
			const anchor = pageAnchor(flatPages[current], unitPages());

			restoreAll();
			const root = contentRoot();
			if (!root) return;
			units = buildUnits(root);
			computePages();

			// A deep-link target outranks the page's first block: a late image
			// can push the target onto the next page, which used to hide it
			// ~100ms after landing (QA E8)
			// Content rebuilt under us (bionic reading): the old target is gone
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

	function fail() {
		failed = true;
		ready = false;
		restoreAll();
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
		const last = range && shown.children[range.end - 1];
		if (!last) return;
		const measured = navEl.getBoundingClientRect().bottom - last.getBoundingClientRect().bottom;
		if (measured > 0 && Math.abs(measured - gapBelow) > 8) {
			gapBelow = measured;
			recompute();
		}
	}

	async function init(el: HTMLElement) {
		try {
			// Heights are only stable once fonts are in; MathJax SVG is
			// pre-rendered and images recompute via their load events
			await document.fonts?.ready;
			await tick();
			if (failed || container !== el) return;

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
			if (failed || container !== el) return;

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
			// above it, so page 1 gets a whole page (Siggi, 2026-10-04). Sizing
			// page 1 to the room under the objectives left 5.3 at 1280x720 with
			// the title alone and its controls below the fold.
			showPage(fromHash ?? 0, { keepHash: target !== null });
			await tick();
			calibrate();

			// Late-loading images change heights — recompute around them
			const onAssetLoad = () => scheduleRecompute();
			root.addEventListener('load', onAssetLoad, true);
			cleanups.push(() => root.removeEventListener('load', onAssetLoad, true));

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
			window.addEventListener('resize', onResize);
			cleanups.push(() => window.removeEventListener('resize', onResize));

			window.addEventListener('keydown', handleKeyDown);
			cleanups.push(() => window.removeEventListener('keydown', handleKeyDown));

			window.addEventListener('hashchange', handleHashChange);
			cleanups.push(() => window.removeEventListener('hashchange', handleHashChange));

			el.addEventListener('touchstart', handleTouchStart, { passive: true });
			el.addEventListener('touchend', handleTouchEnd, { passive: true });
			cleanups.push(() => {
				el.removeEventListener('touchstart', handleTouchStart);
				el.removeEventListener('touchend', handleTouchEnd);
			});

			// Typography settings change block heights
			let firstSettings = true;
			const unsubscribe = settings.subscribe(() => {
				if (firstSettings) {
					firstSettings = false;
					return;
				}
				scheduleRecompute();
			});
			cleanups.push(unsubscribe);

			// Content swaps under us (e.g. bionic reading restoring its
			// innerHTML snapshot) orphan our element references — rebuild
			observer = new MutationObserver(() => scheduleRecompute());
			observer.observe(root, { childList: true });
			cleanups.push(() => observer?.disconnect());
		} catch (e) {
			console.warn('Paged mode init failed; falling back to scrolling:', e);
			fail();
		}
	}

	$effect(() => {
		const el = container;
		if (!browser || !el) return;

		failed = false;
		completionFired = false;
		completedUnits.clear();
		init(el);

		return () => {
			clearTimeout(recomputeTimer);
			for (const cleanup of cleanups) cleanup();
			cleanups = [];
			observer = undefined;
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
	// pager fails or goes, it takes its text back unless something else was announced
	// since, so the region never describes pages that are not on screen.
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
	<!-- data-paged-reader: the global ←/→ section shortcut steps aside for it -->
	<!-- D20: proposed (S8.2): 'Síðuflakk', 'Fyrri síða', 'Fyrri', 'Næsta síða' and 'Næsta',
	     as v1.1 wrote them at dde768e; the label is pager.ts's positionLabel (S8.1) -->
	<nav class="paged-nav" aria-label="Síðuflakk" data-paged-reader bind:this={navEl}>
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
		/* Not --text-tertiary: 2.90:1 on --bg-primary fails AA (QA E18) */
		color: var(--text-secondary);
		text-align: center;
	}
</style>
