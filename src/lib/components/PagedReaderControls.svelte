<!--
  PagedReaderControls - Hybrid viewport-aware pagination (reader plan P0.4)

  Outer level: the sub-section boundaries already present in the prerendered
  HTML (article.cnx-module > section). Inner level: viewport-fitting page
  splits computed by utils/paginate.ts over measured block heights.

  Pages are applied by HIDING out-of-page blocks rather than moving them:
  the DOM the content actions (practiceProblems, glossaryTerms, ...) enhanced
  stays intact, so their listeners survive page turns. Restoring visibility
  (mode switch, destroy, failure) returns the exact scrolled experience.
-->
<script lang="ts">
	import { tick } from 'svelte';
	import { browser } from '$app/environment';
	import { settings } from '$lib/stores/settings';
	import { paginate, pageIndexForItem, type PageRange } from '$lib/utils/paginate';

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

	const ATOMIC_SELECTOR = [
		'figure',
		'table',
		'pre',
		'.equation',
		'.math-display',
		'mjx-container[display]',
		'.note',
		'.example',
		'.exercise',
		'.checkpoint',
		'.learning-objectives',
		'.chapter-outline',
		'.practice-problem-container',
		'.practice-problem'
	].join(', ');

	const KEEP_WITH_NEXT_SELECTOR = 'h2, h3, h4';

	function availableHeight(): number {
		// Reading height: viewport minus header/breadcrumb chrome above the
		// content and the pagination controls below it
		return Math.max(320, window.innerHeight - 260);
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
		const result: Unit[] = [];
		let intro: HTMLElement[] = [];

		for (const child of Array.from(root.children) as HTMLElement[]) {
			if (child.tagName === 'SECTION') {
				if (intro.length > 0) {
					result.push({ wrapper: null, children: intro, pages: [] });
					intro = [];
				}
				result.push({
					wrapper: child,
					children: Array.from(child.children) as HTMLElement[],
					pages: []
				});
			} else {
				intro.push(child);
			}
		}
		if (intro.length > 0) {
			result.push({ wrapper: null, children: intro, pages: [] });
		}
		return result;
	}

	function computePages() {
		const viewportH = availableHeight();
		for (const unit of units) {
			const items = unit.children.map((el) => ({
				height: measure(el),
				atomic: el.matches(ATOMIC_SELECTOR),
				keepWithNext: el.matches(KEEP_WITH_NEXT_SELECTOR)
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
		const top = container.getBoundingClientRect().top + window.scrollY - 96;
		window.scrollTo({ top: Math.max(0, top) });
	}

	function updateHash() {
		const flat = flatPages[current];
		if (!flat) return;
		const hash =
			flat.unit === 0 && flat.page === 0
				? window.location.pathname + window.location.search
				: flat.page === 0
					? `#sub-${flat.unit}`
					: `#sub-${flat.unit}-p-${flat.page}`;
		try {
			history.replaceState(history.state, '', hash);
		} catch {
			/* history can throw in exotic embeddings; hash is cosmetic */
		}
	}

	function announce() {
		announcement = `Síða ${current + 1} af ${flatPages.length}`;
	}

	function showPage(index: number, { scroll = true } = {}) {
		current = Math.max(0, Math.min(index, flatPages.length - 1));
		applyVisibility();
		updateHash();
		announce();
		if (scroll) scrollToContentTop();
	}

	function markUnitComplete(unitIndex: number) {
		if (completedUnits.has(unitIndex)) return;
		completedUnits.add(unitIndex);
		onsubsectioncomplete?.(unitIndex);
		if (completedUnits.size === units.length && !completionFired) {
			completionFired = true;
			oncomplete?.();
		}
	}

	function next() {
		const flat = flatPages[current];
		if (!flat) return;
		const unit = units[flat.unit];
		// Advancing past a sub-section's last page marks it read
		if (flat.page === unit.pages.length - 1) {
			markUnitComplete(flat.unit);
		}
		if (current < flatPages.length - 1) {
			showPage(current + 1);
		}
	}

	function prev() {
		if (current > 0) showPage(current - 1);
	}

	function resolveHash(hash: string): number | null {
		const m = hash.match(/^#sub-(\d+)(?:-p-(\d+))?$/);
		if (m) {
			const u = parseInt(m[1], 10);
			const p = m[2] ? parseInt(m[2], 10) : 0;
			const idx = flatPages.findIndex((f) => f.unit === u && f.page === p);
			return idx >= 0 ? idx : null;
		}
		// Element deep link (cross-references, figure/equation anchors)
		if (hash.length > 1) {
			const root = contentRoot();
			let target: HTMLElement | null = null;
			try {
				target = root?.querySelector<HTMLElement>(`#${CSS.escape(hash.slice(1))}`) ?? null;
			} catch {
				return null;
			}
			if (target) {
				for (let u = 0; u < units.length; u++) {
					const i = units[u].children.findIndex((el) => el === target || el.contains(target));
					if (i >= 0) {
						const p = pageIndexForItem(units[u].pages, i);
						return flatPages.findIndex((f) => f.unit === u && f.page === p);
					}
				}
			}
		}
		return null;
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.defaultPrevented || isTyping()) return;
		if (event.ctrlKey || event.metaKey || event.altKey) return;

		if (event.key === 'ArrowRight' || event.key === 'PageDown' || (event.key === ' ' && !event.shiftKey)) {
			event.preventDefault();
			next();
		} else if (event.key === 'ArrowLeft' || event.key === 'PageUp' || (event.key === ' ' && event.shiftKey)) {
			event.preventDefault();
			prev();
		}
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
		if (Math.abs(dx) > 60 && Math.abs(dy) < 40) {
			if (dx < 0) next();
			else prev();
		}
	}

	function handleHashChange() {
		const idx = resolveHash(window.location.hash);
		if (idx !== null && idx !== current) {
			showPage(idx);
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
			const flat = flatPages[current];
			const anchor = flat ? { unit: flat.unit, item: units[flat.unit].pages[flat.page].start } : null;

			restoreAll();
			const root = contentRoot();
			if (!root) return;
			units = buildUnits(root);
			computePages();

			let idx = 0;
			if (anchor && anchor.unit < units.length) {
				const p = pageIndexForItem(units[anchor.unit].pages, anchor.item);
				const found = flatPages.findIndex((f) => f.unit === anchor.unit && f.page === p);
				idx = found >= 0 ? found : 0;
			}
			showPage(idx, { scroll: false });
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

			units = buildUnits(root);
			computePages();
			if (flatPages.length === 0) {
				fail();
				return;
			}
			ready = true;

			const fromHash = resolveHash(window.location.hash);
			showPage(fromHash ?? 0, { scroll: fromHash !== null });

			// Late-loading images change heights — recompute around them
			const onAssetLoad = () => scheduleRecompute();
			root.addEventListener('load', onAssetLoad, true);
			cleanups.push(() => root.removeEventListener('load', onAssetLoad, true));

			const onResize = () => scheduleRecompute();
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

	let flat = $derived(flatPages[current]);
	let unitPageCount = $derived(flat ? units[flat.unit]?.pages.length ?? 1 : 1);
</script>

{#if ready && !failed && flatPages.length > 0}
	<nav class="paged-nav" aria-label="Síðuflakk">
		<button class="paged-nav-btn" onclick={prev} disabled={current === 0} aria-label="Fyrri síða">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
			Fyrri
		</button>

		<span class="paged-nav-label">
			{#if flat}
				Hluti {flat.unit + 1} af {units.length} · Síða {flat.page + 1} af {unitPageCount}
			{/if}
		</span>

		<button
			class="paged-nav-btn"
			onclick={next}
			disabled={current === flatPages.length - 1 && completionFired}
			aria-label="Næsta síða"
		>
			Næsta
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		</button>
	</nav>

	<div class="sr-only" aria-live="polite">{announcement}</div>
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
		color: var(--text-tertiary);
		text-align: center;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
