<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { afterNavigate, beforeNavigate } from '$app/navigation';
	import { browser } from '$app/env';
	import type { PageData } from './$types';
	import { reader, analyticsStore, objectivesStore } from '$lib/stores';
	import {
		isSectionRead,
		isSectionBookmarked,
		getSavedScrollPosition,
		readPagePlace,
		type PagePlace,
		type ScrollPositions
	} from '$lib/stores/reader';
	import { readingMode, settings, type ReadingMode } from '$lib/stores/settings';
	import ContentRenderer from '$lib/components/ContentRenderer.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import NavigationButtons from '$lib/components/NavigationButtons.svelte';
	import TextHighlighter from '$lib/components/TextHighlighter.svelte';
	import AnnotationSidebar from '$lib/components/AnnotationSidebar.svelte';
	import PreviewBanner from '$lib/components/PreviewBanner.svelte';
	import BookAttribution from '$lib/components/BookAttribution.svelte';
	import PdfDownloadButton from '$lib/components/PdfDownloadButton.svelte';
	import PagedReaderControls from '$lib/components/PagedReaderControls.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import { PAGE_BUDGET, decodePageHash, firstInView, pageProgress, type PagerState } from '$lib/utils/pager';
	import { buildUnits } from '$lib/utils/paginate';
	import { readDetection } from '$lib/actions/readDetection';
	import RecallPrompt from '$lib/components/RecallPrompt.svelte';
	import RecallReadBack from '$lib/components/RecallReadBack.svelte';
	import { entriesForSection, recallStore } from '$lib/stores/recall';
	import {
		endMarkerActive,
		isFrontMatterChapter,
		pagedSectionMark,
		readingModeFromSearch,
		recallTrigger,
		resolveReadingMode,
		shouldPage
	} from '$lib/utils/readerPolicy';
	import { createObjectiveKey } from '$lib/utils/storeHelpers';
	import { feedbackHref } from '$lib/utils/feedbackPrefill';
	import { textbookPhrase } from '$lib/utils/metaDescription';
	import { fade, fly } from 'svelte/transition';

	let { data }: { data: PageData } = $props();

	let showAnnotationSidebar = $state(false);
	let shareSuccess = $state(false);
	let shareTimeout: ReturnType<typeof setTimeout>;
	let showRecallPrompt = $state(false);
	let showRecallReadBack = $state(false);
	// The reader went back from the section's end with 'Fyrri' or ←, to see the last page again
	let endUncovered = $state(false);
	// The section whose end is open. The prompt sits inside {#key} (S9.3), which rebuilds on a
	// section change before afterNavigate resets showRecallPrompt, so without this a second
	// prompt mounted for the next section and was abandoned at once (counted twice; PED-17)
	let endFor = $state('');
	// reachedEnd() runs once per visit to a section, whichever end gets there first (S8.4)
	let endReached = false;
	let showContinuePrompt = $state(false);
	let savedPosition: { scrollY: number; percentage: number; page: PagePlace | null } | null = $state(null);
	let continuePromptTimeout: ReturnType<typeof setTimeout>;

	// The pager (plan step S8.2), dark: a section pages only under a '?lestur=sidur' link or a
	// mode the reader picked, never by default (D06). The link is read once, in the browser,
	// when this page mounts: never at prerender, never stored (PED-35). SvelteKit reuses this
	// component across sections, so a link's mode lasts until the reader leaves the section
	// pages: ruled at S9.0 (docs/decisions/2026-11-08-reader-lestur-link-rule-sticky-as-built.md).
	// Until onMount runs nothing pages, so prerender and hydration match main, and a mode the
	// link overrides never mounts the pager.
	let linkMode: ReadingMode | null = $state(null);
	let modeReady = $state(false);
	// What the pager reports (S8.4, CODE-17): ← / → and the end marker follow it, not the mode
	let pagerState: PagerState = $state('pending');
	// Bound to the content wrapper inside {#key}; the pager works on it (dde768e :32-33)
	let contentWrapper: HTMLElement | undefined = $state();
	// A rollup always scrolls (ruling 2). The type comes from the table of contents.
	let paged = $derived(
		modeReady && shouldPage(resolveReadingMode(linkMode, $readingMode), data.navigation.current.section.type)
	);
	let pagedMark = $derived(pagedSectionMark(paged, pagerState));
	// The pager is at work (pending, ready or at the end; not failed), so the section does not
	// scroll as in scrolled mode, and scrolled mode's continue-reading code and its bottom
	// completion button stand down (plan step S9.3; CODE-07, UI-04). Keyed on the pager, not
	// the mode: a failed pager gives the section back to scrolling, and they return with it.
	let pagerWorking = $derived(pagedMark !== undefined);

	// The in-view way out (plan step S9.3; UI-05, PED-01, CODE-07). It shows while the section
	// pages, and after the reader switched to scrolling here, so they can switch back; never
	// for a reader who has not paged, since offering paging to everyone is the picker S11.3
	// owns (D06). Choosing stores the mode, as D06 allows for a pick, and replaces a link's mode
	// for the rest of the visit.
	let switchedOff = $state(false);
	let showModeSwitch = $derived(paged || switchedOff);
	let pagerControls: ReturnType<typeof PagedReaderControls> | undefined = $state();
	let modeControl: ReturnType<typeof SegmentedControl<ReadingMode>> | undefined = $state();
	const MODES: { value: ReadingMode; label: string }[] = [
		{ value: 'paged', label: 'Síðuskipt' },
		{ value: 'scrolled', label: 'Samfellt skrun' }
	];
	/** Where the reader was when they switched to paged: the pager opens that page */
	let startAt: HTMLElement | null = $state(null);
	/** The block a switch to scrolling kept in place. Not $state. */
	let keptAnchor: HTMLElement | null = null;

	// The machine-translation notice, on an unreviewed section. Paged, it moves into the pager's
	// container, where the arrival scroll lands, and stands above the section's first page; the
	// label row carries a compact marker on every page (plan step S9.4; UI-09, ruling 1 kept).
	let unreviewed = $derived(!data.navigation.current.section.reviewed);
	/** What stands above the first page, inside the pager's container: the notice and the offer
	 *  of a saved place. The pager budgets page 1 for it and re-splits when an item goes. */
	let pageLead: HTMLElement | undefined = $state();

	// A paged reader's place, for a later visit (plan step S11.3; CODE-07, D13, [USER]'s choice
	// of 2026-11-08): saved on leaving a paged section, offered on return as a card above page 1,
	// where the arrival lands. Offered once per visit, and only to a reader who arrived with no
	// address and did not switch in from scrolling.
	let savedPlace: PagePlace | null = null;
	/** The label of the page offered, while the card shows */
	let placeOffer: string | null = $state(null);
	let placeOffered = false;
	/** The pager's last position, for the place saved on leaving. Not $state. */
	let lastPosition: { index: number; total: number } | null = null;

	// Room at the end of the page that the pager asks for when the document is too short to bring
	// the content top under the header (S9.5; UI-19's arrival shortfall): blank, after the
	// section links, never inside the content or the pager's container
	let pagedReserve = $state(0);

	// Print the current section
	function handlePrint() {
		window.print();
	}

	// Share the current section URL
	async function handleShare() {
		const url = window.location.href;
		const title = `${data.section.section} ${data.section.title} | Námsbókasafn`;

		// Try native share API first (mobile)
		if (navigator.share) {
			try {
				await navigator.share({ title, url });
				return;
			} catch (err) {
				// User cancelled or error - fall through to clipboard
			}
		}

		// Fall back to clipboard copy
		try {
			await navigator.clipboard.writeText(url);
			shareSuccess = true;
			clearTimeout(shareTimeout);
			shareTimeout = setTimeout(() => {
				shareSuccess = false;
			}, 2000);
		} catch (err) {
			console.error('Could not copy to clipboard:', err);
		}
	}

	// Subscribe to reader state for reactivity
	let progress = $derived($reader.progress);
	let bookmarks = $derived($reader.bookmarks);

	// Track scroll progress. Not while the pager works: every page turn scrolls, so the reader
	// store rewrote itself on each one, measuring the page shown rather than progress, and a
	// tab still reading could write back what another tab had just erased (CODE-07)
	function handleScroll() {
		if (pagerWorking) return;
		const scrollTop = window.scrollY;
		const docHeight = document.documentElement.scrollHeight - window.innerHeight;
		if (docHeight > 0) {
			const progress = Math.round(scrollTop / docHeight * 100);
			reader.setScrollProgress(progress);
		}
	}

	// Identifies the section currently shown; also used by {#key} below to
	// remount content components (and their actions) on section navigation
	let sectionKey = $derived(`${data.bookSlug}/${data.chapterSlug}/${data.sectionSlug}`);

	// Per-section setup. SvelteKit reuses this component when only params
	// change (prev/next navigation), so this must run per navigation, not in
	// onMount. afterNavigate also fires on initial mount; the key guard skips
	// hash-only navigations within the same section.
	let activeSectionKey = '';

	afterNavigate(({ shallow, type }) => {
		if (shallow && type === 'goto') return;
		if (sectionKey === activeSectionKey) return;
		activeSectionKey = sectionKey;

		reader.setCurrentLocation(data.bookSlug, data.chapterSlug, data.sectionSlug);
		reader.setScrollProgress(0); // Reset scroll progress
		// Also ends any session from the previous section
		analyticsStore.startReadingSession(data.bookSlug, data.chapterSlug, data.sectionSlug);

		showRecallPrompt = false;
		showRecallReadBack = false;
		endUncovered = false;
		switchedOff = false;
		startAt = null;
		keptAnchor = null;
		pagedReserve = 0;
		endReached = false;
		placeOffer = null;
		placeOffered = false;
		lastPosition = null;

		// Reset the continue-reading prompt, then check this section's saved position
		clearTimeout(continuePromptTimeout);
		showContinuePrompt = false;
		savedPosition = null;
		const saved = reader.getScrollPosition(data.bookSlug, data.chapterSlug, data.sectionSlug);
		savedPlace = readPagePlace(saved?.page);
		if (saved && saved.percentage > 10) {
			// Only show prompt if user was past 10% of the document
			savedPosition = { scrollY: saved.scrollY, percentage: saved.percentage, page: savedPlace };
			showContinuePrompt = true;
			// Auto-hide the prompt after 8 seconds
			continuePromptTimeout = setTimeout(() => {
				showContinuePrompt = false;
			}, 8000);
		}
	});

	onMount(() => {
		window.addEventListener('scroll', handleScroll, { passive: true });

		// The visit-only link (PED-35). Only here: SvelteKit fails the build when a prerendered
		// page reads the query string, and a load function would run at prerender.
		linkMode = readingModeFromSearch(window.location.search);
		modeReady = true;

		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});

	// Save scroll position before navigating away; not while the pager works, whose scroll
	// position says which page was shown, not how far the reader got (CODE-07)
	beforeNavigate(({ shallow, type }) => {
		if (shallow && type === 'goto') return;

		if (browser && !pagerWorking) {
			const scrollTop = window.scrollY;
			const docHeight = document.documentElement.scrollHeight - window.innerHeight;
			const percentage = docHeight > 0 ? Math.round(scrollTop / docHeight * 100) : 0;
			reader.saveScrollPosition(data.bookSlug, data.chapterSlug, data.sectionSlug, scrollTop, percentage);
		} else if (browser) {
			// Paged, the place, not the scroll position (S11.3): its part and first block, and the
			// page's share of the section as the percentage. Nothing for the first page.
			const place = pagerControls?.currentPlace();
			if (place && lastPosition && lastPosition.index > 0) {
				const { index, total } = lastPosition;
				reader.saveScrollPosition(data.bookSlug, data.chapterSlug, data.sectionSlug, window.scrollY, pageProgress(index, total), place);
			}
		}
	});

	// End analytics session when leaving
	onDestroy(() => {
		analyticsStore.endReadingSession();
		clearTimeout(continuePromptTimeout);
		clearTimeout(shareTimeout);
	});

	// Handle "Continue where you left off" action
	function handleContinueReading() {
		// A place saved while paging names its block: scroll to it, wherever it now sits (S11.3)
		const block = savedPosition?.page?.block ? document.getElementById(savedPosition.page.block) : null;
		if (block) {
			block.scrollIntoView({ behavior: 'smooth', block: 'start' });
		} else if (savedPosition) {
			window.scrollTo({ top: savedPosition.scrollY, behavior: 'smooth' });
		}
		showContinuePrompt = false;
		clearTimeout(continuePromptTimeout);
	}

	/** Offer the saved place once the pager is first ready on this visit (S11.3) */
	function offerPlace() {
		if (placeOffered) return;
		placeOffered = true;
		if (!savedPlace || startAt || window.location.hash) return;
		placeOffer = pagerControls?.placeLabel(savedPlace) ?? null;
	}

	/** 'Halda áfram': open the saved place; the card goes when the page turns */
	function resumePlace() {
		if (savedPlace) pagerControls?.openPlace(savedPlace);
		placeOffer = null;
	}

	/** 'Byrja á byrjun': stay on page 1 and forget the place, as the scrolled prompt's dismissal does */
	function startFromBeginning() {
		placeOffer = null;
		savedPlace = null;
		reader.clearScrollPosition(data.bookSlug, data.chapterSlug, data.sectionSlug);
		pagerControls?.focusPage();
	}

	// Dismiss the continue prompt
	function dismissContinuePrompt() {
		showContinuePrompt = false;
		clearTimeout(continuePromptTimeout);
		// Clear the saved position since user chose not to continue
		reader.clearScrollPosition(data.bookSlug, data.chapterSlug, data.sectionSlug);
	}

	// Whether this section's recall prompt is still to come: a numbered section (not a rollup,
	// an introduction or the Formáli) whose prompt has not shown yet (plan step S5.2, call 2)
	// The type comes from the table of contents: the section's HTML does not carry it
	let recallOwed = $derived(
		recallTrigger({
			type: data.navigation.current.section.type,
			isFrontMatter: isFrontMatterChapter(data.chapterSlug),
			alreadyPrompted: $recallStore.prompted.some(
				(p) =>
					p.bookSlug === data.bookSlug && p.chapterSlug === data.chapterSlug && p.sectionSlug === data.sectionSlug
			)
		}) !== null
	);

	// Whether this section has a saved recall to read back on a return visit (plan step S5.5,
	// D18's 2026-11-01 follow-up): the prompt shows once per section, so its entry shows instead
	let hasRecallEntry = $derived(
		entriesForSection($recallStore, {
			bookSlug: data.bookSlug,
			chapterSlug: data.chapterSlug,
			sectionSlug: data.sectionSlug
		}).length > 0
	);

	/**
	 * The two mark-read buttons. Decision D10: marking read by hand does not open the recall
	 * prompt; the prompt waits for the end of the section.
	 */
	function markAsRead() {
		reader.markAsRead(data.bookSlug, data.chapterSlug, data.sectionSlug);
	}

	/**
	 * The reader reached the section's end: mark it read, and open its prompt if one is owed, or
	 * else read back the recall saved on an earlier visit (S5.5). Scrolled, the end is the marker
	 * below the content coming into view; paged, it is 'Næsta' on the last page (ruling 3).
	 *
	 * Once per visit: a pager that fails after its last 'Næsta', or a switch to scrolling after
	 * it, wakes the end marker, which has not fired on this visit. A second run would open the
	 * read-back beside the prompt that is still showing its saved message (S8.4's review).
	 */
	function reachedEnd() {
		if (endReached) return;
		endReached = true;
		endFor = sectionKey;
		reader.markAsRead(data.bookSlug, data.chapterSlug, data.sectionSlug);
		if (recallOwed) {
			recallStore.markPrompted(data.bookSlug, data.chapterSlug, data.sectionSlug);
			showRecallPrompt = true;
		} else if (hasRecallEntry) {
			showRecallReadBack = true;
		}
	}

	/**
	 * After the recall prompt saves or closes, its form leaves the DOM with focus inside it, so
	 * move focus to the next step: the next-section link, or on a book's last section the
	 * section list (plan step S5.3, UI-01). Never the content wrapper, which would send a screen
	 * reader back to the start of the section.
	 */
	async function focusAfterRecall() {
		await tick();
		const next =
			document.querySelector<HTMLElement>('[data-nav="next"]') ??
			document.querySelector<HTMLElement>('[data-nav="sections"]');
		if (!next) return;
		next.focus({ preventScroll: true });
		// A plain focus() scrolls the link only just into view, at the window's bottom edge under
		// the timer pill and the toasts; outside the clear band, centre it (S9.3, UI-20)
		const rect = next.getBoundingClientRect();
		const top = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
		if (rect.top < top || rect.bottom > window.innerHeight - PAGE_BUDGET.bottomClearance) {
			next.scrollIntoView({ block: 'center' });
		}
	}

	/**
	 * 'Ljúka kafla' on the last page (ruling 3; S9.3, UI-20): the section's end, and then on to
	 * the next section. When nothing opens (the prompt shown on an earlier visit, no recall
	 * saved), focus goes straight to the next-section link; else it goes there when the prompt
	 * or the read-back closes. Not in scrolled mode, whose end marker comes into view while the
	 * reader may be anywhere.
	 */
	function finishFromPager() {
		endUncovered = false;
		reachedEnd();
		if (!showRecallPrompt && !showRecallReadBack) focusAfterRecall();
	}

	function closeRecallPrompt() {
		showRecallPrompt = false;
		focusAfterRecall();
	}

	function closeRecallReadBack() {
		showRecallReadBack = false;
		focusAfterRecall();
	}

	// Paged, the section's end takes the page's place: the pager hides the page while the
	// prompt or the read-back is open, until the reader goes back with 'Fyrri' (S9.3, UI-21)
	let endHere = $derived(endFor === sectionKey);
	let endCovered = $derived(paged && endHere && (showRecallPrompt || showRecallReadBack) && !endUncovered);

	/** The first block of the content on screen, in the scrolled layout */
	function firstBlockOnScreen(): HTMLElement | null {
		const root = contentWrapper?.querySelector<HTMLElement>('article.cnx-module');
		if (!root) return null;
		const blocks = buildUnits(root).flatMap((unit) => unit.children);
		const spans = blocks.map((el) => {
			const rect = el.getBoundingClientRect();
			return { top: rect.top, bottom: rect.bottom };
		});
		const i = firstInView(spans, {
			top: PAGE_BUDGET.scrollOffset,
			bottom: window.innerHeight - PAGE_BUDGET.bottomClearance
		});
		return i >= 0 ? blocks[i] : null;
	}

	/**
	 * 'Síðuskipt' or 'Samfellt skrun'. To scrolling: the block the page started with stays where
	 * it was on screen (its top is measured before the pager shows every block again, and the
	 * window scrolled by the difference after), and the page hash goes, which would otherwise
	 * reopen that page on the way back. To paged: the pager opens the page holding the block
	 * on screen. From the label row's button, which leaves with the pager, focus goes to the
	 * toolbar's.
	 */
	async function chooseMode(mode: ReadingMode, { fromPager = false } = {}) {
		if (mode === 'paged' === paged) return;
		// A local count, per book, for calls 1 and 3 (S9.5, PED-17); never sent
		analyticsStore.countEvent(data.bookSlug, mode === 'paged' ? 'switchToPaged' : 'switchToScrolled');
		linkMode = null;
		if (mode === 'scrolled') {
			const anchor = pagerControls?.shownAnchor() ?? null;
			// Read before the pager unmounts on the flush: since S11.2 a page's address can be a
			// block's id, which only the pager knows it wrote
			const pageAddress =
				pagerControls?.isPageHash(window.location.hash) ?? decodePageHash(window.location.hash) !== null;
			const before = anchor?.getBoundingClientRect().top;
			keptAnchor = anchor;
			switchedOff = true;
			startAt = null;
			showContinuePrompt = false;
			settings.setReadingMode('scrolled');
			if (pageAddress) {
				try {
					history.replaceState(history.state, '', window.location.pathname + window.location.search);
				} catch {
					/* the hash is cosmetic */
				}
			}
			await tick();
			if (anchor?.isConnected && before !== undefined) {
				window.scrollBy({ top: anchor.getBoundingClientRect().top - before });
			}
			if (fromPager) modeControl?.focus('scrolled');
		} else {
			// Straight back, the block the switch kept in place is still where the reader left
			// it: reopen its page, which a guess from the screen may miss by one
			const kept = keptAnchor?.isConnected ? keptAnchor.getBoundingClientRect() : null;
			const keptInView =
				kept && kept.top >= PAGE_BUDGET.scrollOffset / 2 && kept.top < window.innerHeight - PAGE_BUDGET.bottomClearance;
			startAt = keptInView ? keptAnchor : firstBlockOnScreen();
			settings.setReadingMode('paged');
		}
	}

	// Reactive checks using subscribed state
	let isRead = $derived(isSectionRead(progress, data.bookSlug, data.chapterSlug, data.sectionSlug));
	let isBookmarked = $derived(isSectionBookmarked(bookmarks, data.bookSlug, data.chapterSlug, data.sectionSlug));

	function toggleBookmark() {
		reader.toggleBookmark(data.bookSlug, data.chapterSlug, data.sectionSlug);
	}

	// Objectives tracking
	function toggleObjective(index: number, text: string) {
		objectivesStore.toggleObjective(data.bookSlug, data.chapterSlug, data.sectionSlug, index, text);
		analyticsStore.logActivity('objective', {
			bookSlug: data.bookSlug,
			chapterSlug: data.chapterSlug,
			sectionSlug: data.sectionSlug,
			action: objectivesStore.isObjectiveCompleted(data.bookSlug, data.chapterSlug, data.sectionSlug, index) ? 'completed' : 'uncompleted'
		});
	}

	function isObjectiveCompleted(index: number): boolean {
		return objectivesStore.isObjectiveCompleted(data.bookSlug, data.chapterSlug, data.sectionSlug, index);
	}

	// Reactive: which objective indices are completed for this section (drives the checkboxes + counter)
	let completedObjectiveIndices = $derived(
		new Set(
			(data.section.objectives ?? [])
				.map((_, i) => i)
				.filter(
					(i) =>
						$objectivesStore.completedObjectives[
							createObjectiveKey(data.bookSlug, data.chapterSlug, data.sectionSlug, i)
						]?.isCompleted
				)
		)
	);
</script>

<!--
  Section View Page - Renders a book section with markdown content
-->

<svelte:head>
	<title>{data.section.section} {data.section.title} | Námsbókasafn</title>
	<!-- Both descriptions end with the book's own subject, from textbookPhrase() (M18; checked by
	     [USER] as D20 batch 10, 2026-11-07) -->
	<meta name="description" content="{data.section.section} {data.section.title} – {textbookPhrase(data.book)}" />
	<meta name="robots" content="index, follow" />
	<link rel="canonical" href="https://namsbokasafn.is/{data.bookSlug}/kafli/{data.chapterSlug}/{data.sectionSlug}/" />
	<meta property="og:title" content="{data.section.section} {data.section.title} | Námsbókasafn" />
	<meta property="og:description" content="{data.section.section} {data.section.title} – {textbookPhrase(data.book)}" />
	<meta property="og:type" content="article" />
	<meta property="og:url" content="https://namsbokasafn.is/{data.bookSlug}/kafli/{data.chapterSlug}/{data.sectionSlug}/" />
</svelte:head>

<article class="max-w-4xl mx-auto px-1 sm:px-0">
	<!-- The in-view way out (S9.3; UI-05, PED-01): the first control in the reading region, before
	     the objectives, so a reader meets it before page 1. v1.1's Lestrarstilling words.
	     'Lestrarstilling' (the group's name), 'Síðuskipt' and 'Samfellt skrun': Checked by [USER] as D20 batch 12 (2026-11-08). -->
	{#if showModeSwitch}
		<!-- Radios since S11.3 (UI-03): a screen reader hears which mode is on; Tab enters the pair
		     once, and the arrow keys choose, as a radio group's do -->
		<div class="mb-3 flex justify-end">
			<SegmentedControl
				bind:this={modeControl}
				legend="Lestrarstilling"
				legendHidden
				variant="inline"
				name="reading-mode"
				options={MODES}
				value={paged ? 'paged' : 'scrolled'}
				onchange={(mode) => chooseMode(mode)}
			/>
		</div>
	{/if}

	<!-- Continue where you left off prompt -->
	{#if showContinuePrompt && savedPosition && !pagerWorking}
		<div
			class="mb-4 p-4 rounded-xl bg-[var(--accent-light)] border border-[var(--accent-subtle)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
			role="alert"
			aria-live="polite"
			transition:fly={{ y: -20, duration: 300 }}
		>
			<div class="flex items-center gap-3">
				<div class="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--accent-light)] flex items-center justify-center">
					<Icon name="book-open" size="md" class="text-[var(--accent-strong)]" />
				</div>
				<div>
					<p class="font-medium text-[var(--text-primary)]">Haltu áfram að lesa</p>
					<p class="text-sm text-[var(--text-secondary)]">
						Þú varst komin(n) {savedPosition.percentage}% í gegnum þennan kafla
					</p>
				</div>
			</div>
			<div class="flex items-center gap-2 w-full sm:w-auto">
				<button
					onclick={handleContinueReading}
					class="flex-1 sm:flex-initial px-4 py-2 text-sm font-medium rounded-lg bg-[var(--accent-color)] text-[var(--on-accent)] hover:bg-[var(--accent-fill-hover)] transition-colors"
				>
					Halda áfram
				</button>
				<button
					onclick={dismissContinuePrompt}
					class="p-2 text-[var(--accent-strong)] hover:bg-[var(--accent-subtle)] rounded-lg transition-colors"
					aria-label="Hunsa"
					title="Byrja frá byrjun"
				>
					<Icon name="x" size="md" />
				</button>
			</div>
		</div>
	{/if}

	<!-- Machine-translation notice on modules that haven't been human-reviewed.
	     Replaces the old always-on PilotBanner; driven by per-section provenance. Paged, it
	     stands inside the pager's container instead (S9.4). -->
	{#if unreviewed && !paged}
		<PreviewBanner bookSlug={data.bookSlug} chapterSlug={data.chapterSlug} sectionSlug={data.sectionSlug} />
	{/if}

	<!-- Reading progress bar -->
	<div class="mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-2">
		<div class="flex items-center gap-2 sm:gap-3">
			{#if data.section.readingTime}
				<span class="inline-flex items-center gap-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
					<Icon name="clock" size="sm" />
					<span>~{data.section.readingTime} mín lestími</span>
				</span>
			{/if}
			{#if data.section.difficulty}
				<span
					class="text-xs px-2 py-0.5 sm:py-1 rounded-full {data.section.difficulty === 'beginner'
						? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
						: data.section.difficulty === 'intermediate'
							? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
							: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}"
				>
					{data.section.difficulty === 'beginner'
						? 'Byrjandi'
						: data.section.difficulty === 'intermediate'
							? 'Miðstig'
							: 'Framhald'}
				</span>
			{/if}
		</div>
		<div class="flex items-center gap-1 sm:gap-2">
			<!-- Print button -->
			<button
				onclick={handlePrint}
				class="p-2 rounded-lg transition-colors text-[var(--text-tertiary)] hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200"
				aria-label="Prenta kafla"
				title="Prenta"
			>
				<Icon name="printer" size="md" />
			</button>
			<!-- Download chapter PDF -->
			<PdfDownloadButton
				manifest={data.pdfManifest}
				bookSlug={data.bookSlug}
				target="chapter"
				chapterNum={data.chapterNumber}
				variant="icon"
			/>
			<!-- Share button -->
			<button
				onclick={handleShare}
				class="p-2 rounded-lg transition-colors {shareSuccess
					? 'text-green-500 bg-green-50 dark:bg-green-900/20'
					: 'text-[var(--text-tertiary)] hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[var(--accent-strong)]'}"
				aria-label={shareSuccess ? 'Hlekkur afritaður' : 'Deila kafla'}
				title={shareSuccess ? 'Hlekkur afritaður!' : 'Deila'}
			>
				{#if shareSuccess}
					<Icon name="check" size="md" />
				{:else}
					<Icon name="share-2" size="md" />
				{/if}
			</button>
			<!-- Annotations button -->
			<button
				onclick={() => showAnnotationSidebar = true}
				class="p-2 rounded-lg transition-colors text-[var(--text-tertiary)] hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[var(--accent-strong)]"
				aria-label="Opna athugasemdir"
				title="Athugasemdir"
			>
				<Icon name="square-pen" size="md" />
			</button>
			<button
				onclick={toggleBookmark}
				class="p-2 rounded-lg transition-colors {isBookmarked
					? 'text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
					: 'text-[var(--text-tertiary)] hover:bg-gray-100 dark:hover:bg-gray-800'}"
				aria-label={isBookmarked ? 'Fjarlægja bókamerki' : 'Bæta við bókamerki'}
			>
				<svg
					class="w-5 h-5"
					fill={isBookmarked ? 'currentColor' : 'none'}
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
					></path>
				</svg>
			</button>
			{#if !isRead}
				<button
					onclick={markAsRead}
					class="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
					aria-label="Merkja sem lesið"
				>
					<Icon name="check" size="sm" />
					<span class="hidden sm:inline">Merkja sem lesið</span>
				</button>
			{:else}
				<span class="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
					<Icon name="check" size="sm" />
					<span class="hidden sm:inline">Lesið</span>
				</span>
			{/if}
		</div>
	</div>

	<!-- Learning Objectives -->
	{#if data.section.objectives && data.section.objectives.length > 0}
		{@const completedCount = data.section.objectives.filter((_, i) => completedObjectiveIndices.has(i)).length}
		<div class="mb-8 p-6 rounded-xl bg-[var(--accent-light)] border border-[var(--accent-subtle)]">
			<div class="flex items-center justify-between mb-3">
				<h3 class="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
					<Icon name="clipboard-check" size="md" />
					Námsmarkmið
				</h3>
				{#if completedCount > 0}
					<span class="text-sm text-[var(--text-secondary)]">
						{completedCount}/{data.section.objectives.length} metin
					</span>
				{/if}
			</div>
			<p class="text-sm text-[var(--text-secondary)] mb-3">
				Eftir að hafa lesið þennan kafla ættirðu að geta:
			</p>
			<ul class="space-y-2">
				{#each data.section.objectives as objective, i (i)}
					{@const completed = completedObjectiveIndices.has(i)}
					<li class="flex items-start gap-3 text-[var(--text-primary)]">
						<!-- Each name holds the number its button shows (WCAG 2.5.3, Label in Name), which
						     also tells the buttons apart. -->
						<button
							onclick={() => toggleObjective(i, objective)}
							class="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors {completed
								? 'bg-green-500 border-green-500 text-white'
								: 'border-[var(--accent-subtle)] hover:border-green-400 dark:hover:border-green-500'}"
							aria-label={completed ? `Afmerkja markmið ${i + 1}` : `Merkja markmið ${i + 1} sem lokið`}
						>
							{#if completed}
								<Icon name="check" size="sm" />
							{:else}
								<span class="text-xs font-medium text-[var(--accent-strong)]">{i + 1}</span>
							{/if}
						</button>
						<span class={completed ? 'line-through opacity-70' : ''}>{objective}</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- Main content wrapped in TextHighlighter for annotation support.
	     {#key} remounts the content components and their actions on section
	     navigation: highlight restoration, equation/figure enhancement, lazy
	     images and read detection all run their mount-time setup per section. -->
	{#key sectionKey}
		<!-- The pager's container (dde768e :419-421). data-paged-section is there from mount,
		     before the page controls render, so the ←/→ section shortcut steps aside for the pager.
		     It sits below the objectives, so the pager's arrival scroll passes them (ruling 1). -->
		<div bind:this={contentWrapper} data-paged-section={pagedMark}>
			<!-- Outside the content root, so it is never paginated, shifts no highlight offsets and
			     trips no observer; the pager shows it above the first page only (S9.4, UI-09) -->
			{#if paged}
				<div bind:this={pageLead}>
					{#if unreviewed}
						<PreviewBanner bookSlug={data.bookSlug} chapterSlug={data.chapterSlug} sectionSlug={data.sectionSlug} />
					{/if}
					{#if placeOffer}
						<!-- The saved place, offered at the content top (S11.3, D13). 'Haltu áfram að lesa' and
						     'Halda áfram' are the scrolled prompt's. 'Þú varst síðast hér:' and 'Byrja á byrjun'
						     (D13's word): Checked by [USER] as D20 batch 13 (2026-11-08). -->
						<div
							class="mb-4 p-4 rounded-xl bg-[var(--accent-light)] border border-[var(--accent-subtle)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
							role="status"
						>
							<div>
								<p class="font-medium text-[var(--text-primary)]">Haltu áfram að lesa</p>
								<p class="text-sm text-[var(--text-secondary)]">Þú varst síðast hér: {placeOffer}</p>
							</div>
							<div class="flex flex-wrap items-center gap-2">
								<button
									onclick={resumePlace}
									class="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--accent-color)] text-[var(--on-accent)] hover:bg-[var(--accent-fill-hover)] transition-colors"
								>
									Halda áfram
								</button>
								<button
									onclick={startFromBeginning}
									class="px-4 py-2 text-sm font-medium rounded-lg border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--accent-subtle)] transition-colors"
								>
									Byrja á byrjun
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/if}
			<TextHighlighter
				bookSlug={data.bookSlug}
				chapterSlug={data.chapterSlug}
				sectionSlug={data.sectionSlug}
			>
				<ContentRenderer
					content={data.section.content}
					bookSlug={data.bookSlug}
					chapterSlug={data.chapterSlug}
					sectionSlug={data.sectionSlug}
					chapterNumber={data.chapterNumber}
					sectionType={data.section.type || ''}
					hideStaticObjectives={!!(data.section.objectives && data.section.objectives.length > 0)}
				/>
			</TextHighlighter>
		</div>

		<!-- The section's end: the free-recall prompt, in place of the old 'Vel gert!' celebration
		     (P0.2), or a section already recalled reads its entry back (S5.5). Between the content
		     and the pager, so paged it takes the page's place (S9.3, UI-21); scrolled, it sits at
		     the end of the content as before. -->
		{#if showRecallPrompt && endHere}
			<RecallPrompt
				bookSlug={data.bookSlug}
				chapterSlug={data.chapterSlug}
				sectionSlug={data.sectionSlug}
				sectionNumber={data.navigation.current.section.number}
				onsaved={focusAfterRecall}
				onclose={closeRecallPrompt}
			/>
		{/if}
		{#if showRecallReadBack && endHere}
			<RecallReadBack
				bookSlug={data.bookSlug}
				chapterSlug={data.chapterSlug}
				sectionSlug={data.sectionSlug}
				sectionNumber={data.navigation.current.section.number}
				onclose={closeRecallReadBack}
			/>
		{/if}

		{#if paged}
			<!-- 'Ljúka kafla' on the last page is the section's end (ruling 3), so it runs reachedEnd
			     and then leads on (finishFromPager). v1.1 passed markAsRead (dde768e :442), which
			     under D10 no longer opens the prompt. -->
			<PagedReaderControls
				bind:this={pagerControls}
				container={contentWrapper}
				oncomplete={finishFromPager}
				onstatechange={(state) => {
					pagerState = state;
					if (state === 'ready') offerPlace();
				}}
				covered={endCovered}
				onuncover={() => endUncovered = true}
				startAt={startAt}
				onleave={() => chooseMode('scrolled', { fromPager: true })}
				lead={pageLead ?? null}
				mtReport={unreviewed
					? feedbackHref({ bok: data.bookSlug, kafli: data.chapterSlug, hluti: data.sectionSlug })
					: null}
				onreserve={(px) => pagedReserve = px}
				ontallpage={() => analyticsStore.countEvent(data.bookSlug, 'pageTooTall')}
				onposition={(p) => {
					reader.setScrollProgress(pageProgress(p.index, p.total));
					lastPosition = { index: p.index, total: p.total };
					// The offer is for page 1: a turn, or 'Halda áfram', takes it away
					if (p.index > 0) placeOffer = null;
				}}
			/>
		{/if}

		<!-- End of section detection: marks the section read, and opens its recall prompt if one
		     is owed. It stays on for a section marked read by hand whose prompt has not shown,
		     because under D10 the prompt waits for the end, and for a section with a saved recall,
		     which it reads back (S5.5). Paged, it stands down (dde768e :451): it sits under the
		     page controls, so it would fire on the first page; the pager's last 'Næsta' is the end.
		     If the pager fails, the section scrolls again and the marker reads again (S8.4,
		     endMarkerActive); reachedEnd() still runs only once per visit. -->
		<div
			use:readDetection={{
				onRead: reachedEnd,
				enabled: (!isRead || recallOwed || hasRecallEntry) && endMarkerActive(paged, pagerState),
				minVisibleTime: 1500
			}}
			class="h-4"
			aria-hidden="true"
			data-section-end
		></div>
	{/key}


	<!-- Mark as read button at bottom. Not under a working pager (UI-04), where 'Næsta' on the
	     last page finishes the section (ruling 3) and the toolbar keeps 'Merkja sem lesið'; a
	     failed pager scrolls again, and this is its end-of-content control. -->
	{#if !isRead && !pagerWorking}
		<div class="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
			<button
				onclick={markAsRead}
				class="inline-flex items-center gap-2 px-6 py-3 text-lg font-medium rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
			>
				<Icon name="check" size="md" />
				Merkja kafla sem lesinn
			</button>
		</div>
	{/if}

	<!-- Per-page attribution: required on every section view (CC/OpenStax). -->
	<BookAttribution attribution={data.book?.attribution} bookSlug={data.bookSlug} />
</article>

<!-- Navigation buttons -->
<NavigationButtons navigation={data.navigation} bookSlug={data.bookSlug} />

{#if paged && pagedReserve > 0}
	<div aria-hidden="true" data-paged-reserve style:height="{pagedReserve}px"></div>
{/if}


<!-- Annotation Sidebar -->
<AnnotationSidebar
	isOpen={showAnnotationSidebar}
	onClose={() => showAnnotationSidebar = false}
	bookSlug={data.bookSlug}
	currentChapter={data.chapterSlug}
	currentSection={data.sectionSlug}
/>
