<!--
  Section View Page - Renders a book section with markdown content
-->
<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { afterNavigate, beforeNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import type { PageData } from './$types';
	import { reader, analyticsStore, objectivesStore } from '$lib/stores';
	import { isSectionRead, isSectionBookmarked, getSavedScrollPosition, type ScrollPositions } from '$lib/stores/reader';
	import ContentRenderer from '$lib/components/ContentRenderer.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import NavigationButtons from '$lib/components/NavigationButtons.svelte';
	import TextHighlighter from '$lib/components/TextHighlighter.svelte';
	import AnnotationSidebar from '$lib/components/AnnotationSidebar.svelte';
	import PreviewBanner from '$lib/components/PreviewBanner.svelte';
	import PdfDownloadButton from '$lib/components/PdfDownloadButton.svelte';
	import { readDetection } from '$lib/actions/readDetection';
	import { createObjectiveKey } from '$lib/utils/storeHelpers';
	import { fade, fly } from 'svelte/transition';

	let { data }: { data: PageData } = $props();

	let showAnnotationSidebar = $state(false);
	let shareSuccess = $state(false);
	let shareTimeout: ReturnType<typeof setTimeout>;
	let showCompletionAnimation = $state(false);
	let completionTimeout: ReturnType<typeof setTimeout>;
	let showContinuePrompt = $state(false);
	let savedPosition: { scrollY: number; percentage: number } | null = $state(null);
	let continuePromptTimeout: ReturnType<typeof setTimeout>;

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

	// Track scroll progress
	function handleScroll() {
		const scrollTop = window.scrollY;
		const docHeight = document.documentElement.scrollHeight - window.innerHeight;
		if (docHeight > 0) {
			const progress = Math.round((scrollTop / docHeight) * 100);
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
	afterNavigate(() => {
		if (sectionKey === activeSectionKey) return;
		activeSectionKey = sectionKey;

		reader.setCurrentLocation(data.bookSlug, data.chapterSlug, data.sectionSlug);
		reader.setScrollProgress(0); // Reset scroll progress
		// Also ends any session from the previous section
		analyticsStore.startReadingSession(data.bookSlug, data.chapterSlug, data.sectionSlug);

		// Reset the continue-reading prompt, then check this section's saved position
		clearTimeout(continuePromptTimeout);
		showContinuePrompt = false;
		savedPosition = null;
		const saved = reader.getScrollPosition(data.bookSlug, data.chapterSlug, data.sectionSlug);
		if (saved && saved.percentage > 10) {
			// Only show prompt if user was past 10% of the document
			savedPosition = { scrollY: saved.scrollY, percentage: saved.percentage };
			showContinuePrompt = true;
			// Auto-hide the prompt after 8 seconds
			continuePromptTimeout = setTimeout(() => {
				showContinuePrompt = false;
			}, 8000);
		}
	});

	onMount(() => {
		window.addEventListener('scroll', handleScroll, { passive: true });

		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});

	// Save scroll position before navigating away
	beforeNavigate(() => {
		if (browser) {
			const scrollTop = window.scrollY;
			const docHeight = document.documentElement.scrollHeight - window.innerHeight;
			const percentage = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
			reader.saveScrollPosition(data.bookSlug, data.chapterSlug, data.sectionSlug, scrollTop, percentage);
		}
	});

	// End analytics session when leaving
	onDestroy(() => {
		analyticsStore.endReadingSession();
		clearTimeout(continuePromptTimeout);
		clearTimeout(shareTimeout);
		clearTimeout(completionTimeout);
	});

	// Handle "Continue where you left off" action
	function handleContinueReading() {
		if (savedPosition) {
			window.scrollTo({ top: savedPosition.scrollY, behavior: 'smooth' });
		}
		showContinuePrompt = false;
		clearTimeout(continuePromptTimeout);
	}

	// Dismiss the continue prompt
	function dismissContinuePrompt() {
		showContinuePrompt = false;
		clearTimeout(continuePromptTimeout);
		// Clear the saved position since user chose not to continue
		reader.clearScrollPosition(data.bookSlug, data.chapterSlug, data.sectionSlug);
	}

	function markAsRead() {
		const wasAlreadyRead = isSectionRead(progress, data.bookSlug, data.chapterSlug, data.sectionSlug);
		reader.markAsRead(data.bookSlug, data.chapterSlug, data.sectionSlug);

		// Show celebration animation only if this is the first time marking as read
		if (!wasAlreadyRead) {
			showCompletionAnimation = true;
			clearTimeout(completionTimeout);
			completionTimeout = setTimeout(() => {
				showCompletionAnimation = false;
			}, 2000);
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

<svelte:head>
	<title>{data.section.section} {data.section.title} | Námsbókasafn</title>
	<meta name="description" content="{data.section.section} {data.section.title} – Efnafræði kennslubók á íslensku" />
	<meta name="robots" content="index, follow" />
	<link rel="canonical" href="https://namsbokasafn.is/{data.bookSlug}/kafli/{data.chapterSlug}/{data.sectionSlug}" />
	<meta property="og:title" content="{data.section.section} {data.section.title} | Námsbókasafn" />
	<meta property="og:description" content="{data.section.section} {data.section.title} – Efnafræði kennslubók á íslensku" />
	<meta property="og:type" content="article" />
	<meta property="og:url" content="https://namsbokasafn.is/{data.bookSlug}/kafli/{data.chapterSlug}/{data.sectionSlug}" />
</svelte:head>

<article class="max-w-4xl mx-auto px-1 sm:px-0">
	<!-- Continue where you left off prompt -->
	{#if showContinuePrompt && savedPosition}
		<div
			class="mb-4 p-4 rounded-xl bg-[var(--accent-light)] border border-[var(--accent-subtle)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
			role="alert"
			aria-live="polite"
			transition:fly={{ y: -20, duration: 300 }}
		>
			<div class="flex items-center gap-3">
				<div class="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--accent-light)] flex items-center justify-center">
					<Icon name="book-open" size="md" class="text-[var(--accent-color)]" />
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
					class="flex-1 sm:flex-initial px-4 py-2 text-sm font-medium rounded-lg bg-[var(--accent-color)] text-white hover:bg-[var(--accent-hover)] transition-colors"
				>
					Halda áfram
				</button>
				<button
					onclick={dismissContinuePrompt}
					class="p-2 text-[var(--accent-color)] hover:bg-[var(--accent-light)] rounded-lg transition-colors"
					aria-label="Hunsa"
					title="Byrja frá byrjun"
				>
					<Icon name="x" size="md" />
				</button>
			</div>
		</div>
	{/if}

	<!-- Machine-translation notice on modules that haven't been human-reviewed.
	     Replaces the old always-on PilotBanner; driven by per-section provenance. -->
	{#if !data.navigation.current.section.reviewed}
		<PreviewBanner />
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
				class="p-2 rounded-lg transition-colors text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200"
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
					: 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[var(--accent-color)]'}"
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
				onclick={() => (showAnnotationSidebar = true)}
				class="p-2 rounded-lg transition-colors text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[var(--accent-color)]"
				aria-label="Opna athugasemdir"
				title="Athugasemdir"
			>
				<Icon name="square-pen" size="md" />
			</button>
			<button
				onclick={toggleBookmark}
				class="p-2 rounded-lg transition-colors {isBookmarked
					? 'text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
					: 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
				aria-label={isBookmarked ? 'Fjarlægja bókamerki' : 'Bæta við bókamerki'}
			>
				<svg class="w-5 h-5" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
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
						<button
							onclick={() => toggleObjective(i, objective)}
							class="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors {completed
								? 'bg-green-500 border-green-500 text-white'
								: 'border-[var(--accent-subtle)] hover:border-green-400 dark:hover:border-green-500'}"
							aria-label={completed ? 'Afmerkja markmið' : 'Merkja markmið sem kláruð'}
						>
							{#if completed}
								<Icon name="check" size="sm" />
							{:else}
								<span class="text-xs font-medium text-[var(--accent-color)]">{i + 1}</span>
							{/if}
						</button>
						<span class="{completed ? 'line-through opacity-70' : ''}">{objective}</span>
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
			/>
		</TextHighlighter>

		<!-- End of section detection - auto-marks as read when user scrolls here -->
		<div
			use:readDetection={{
				onRead: markAsRead,
				enabled: !isRead,
				minVisibleTime: 1500
			}}
			class="h-4"
			aria-hidden="true"
		></div>
	{/key}

	<!-- Mark as read button at bottom -->
	{#if !isRead}
		<div class="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
			<button
				onclick={markAsRead}
				class="inline-flex items-center gap-2 px-6 py-3 text-lg font-medium rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
			>
				<Icon name="check" size="md" />
				Merkja kafla sem lesinn
			</button>
		</div>
	{/if}
</article>

<!-- Navigation buttons -->
<NavigationButtons navigation={data.navigation} bookSlug={data.bookSlug} />

<!-- Section Completion Animation -->
{#if showCompletionAnimation}
	<div
		class="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
		aria-hidden="true"
	>
		<!-- Floating particles with predefined positions -->
		<div class="completion-particle particle-1">
			<svg class="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
				<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
			</svg>
		</div>
		<div class="completion-particle particle-2">
			<div class="w-2 h-2 rounded-full bg-emerald-400"></div>
		</div>
		<div class="completion-particle particle-3">
			<div class="w-3 h-3 rounded-full bg-teal-400"></div>
		</div>
		<div class="completion-particle particle-4">
			<svg class="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
				<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
			</svg>
		</div>
		<div class="completion-particle particle-5">
			<div class="w-2 h-2 rounded-full bg-emerald-400"></div>
		</div>
		<div class="completion-particle particle-6">
			<div class="w-3 h-3 rounded-full bg-teal-400"></div>
		</div>
		<div class="completion-particle particle-7">
			<svg class="w-3 h-3 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
				<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
			</svg>
		</div>
		<div class="completion-particle particle-8">
			<div class="w-2 h-2 rounded-full bg-green-400"></div>
		</div>

		<!-- Central message -->
		<div class="completion-message bg-emerald-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
			<Icon name="check" size="lg" />
			<span class="font-semibold">Vel gert!</span>
		</div>
	</div>
{/if}

<!-- Annotation Sidebar -->
<AnnotationSidebar
	isOpen={showAnnotationSidebar}
	onClose={() => (showAnnotationSidebar = false)}
	bookSlug={data.bookSlug}
	currentChapter={data.chapterSlug}
	currentSection={data.sectionSlug}
/>

<style>
	/* Completion animation particles */
	.completion-particle {
		position: absolute;
		opacity: 0;
	}

	.particle-1 { animation: burst-up-right 1.2s ease-out 0s forwards; }
	.particle-2 { animation: burst-up 1.2s ease-out 0.05s forwards; }
	.particle-3 { animation: burst-up-left 1.2s ease-out 0.1s forwards; }
	.particle-4 { animation: burst-right 1.2s ease-out 0.15s forwards; }
	.particle-5 { animation: burst-left 1.2s ease-out 0.2s forwards; }
	.particle-6 { animation: burst-down-right 1.2s ease-out 0.25s forwards; }
	.particle-7 { animation: burst-down 1.2s ease-out 0.3s forwards; }
	.particle-8 { animation: burst-down-left 1.2s ease-out 0.35s forwards; }

	@keyframes burst-up {
		0% { opacity: 1; transform: translate(0, 0) scale(0); }
		20% { opacity: 1; transform: translate(0, 0) scale(1); }
		100% { opacity: 0; transform: translate(0, -100px) scale(0.3); }
	}
	@keyframes burst-up-right {
		0% { opacity: 1; transform: translate(0, 0) scale(0); }
		20% { opacity: 1; transform: translate(0, 0) scale(1); }
		100% { opacity: 0; transform: translate(70px, -70px) scale(0.3); }
	}
	@keyframes burst-up-left {
		0% { opacity: 1; transform: translate(0, 0) scale(0); }
		20% { opacity: 1; transform: translate(0, 0) scale(1); }
		100% { opacity: 0; transform: translate(-70px, -70px) scale(0.3); }
	}
	@keyframes burst-right {
		0% { opacity: 1; transform: translate(0, 0) scale(0); }
		20% { opacity: 1; transform: translate(0, 0) scale(1); }
		100% { opacity: 0; transform: translate(100px, 0) scale(0.3); }
	}
	@keyframes burst-left {
		0% { opacity: 1; transform: translate(0, 0) scale(0); }
		20% { opacity: 1; transform: translate(0, 0) scale(1); }
		100% { opacity: 0; transform: translate(-100px, 0) scale(0.3); }
	}
	@keyframes burst-down {
		0% { opacity: 1; transform: translate(0, 0) scale(0); }
		20% { opacity: 1; transform: translate(0, 0) scale(1); }
		100% { opacity: 0; transform: translate(0, 80px) scale(0.3); }
	}
	@keyframes burst-down-right {
		0% { opacity: 1; transform: translate(0, 0) scale(0); }
		20% { opacity: 1; transform: translate(0, 0) scale(1); }
		100% { opacity: 0; transform: translate(70px, 50px) scale(0.3); }
	}
	@keyframes burst-down-left {
		0% { opacity: 1; transform: translate(0, 0) scale(0); }
		20% { opacity: 1; transform: translate(0, 0) scale(1); }
		100% { opacity: 0; transform: translate(-70px, 50px) scale(0.3); }
	}

	/* Central completion message */
	.completion-message {
		animation: message-pop 2s ease-out forwards;
	}

	@keyframes message-pop {
		0% {
			opacity: 0;
			transform: scale(0.5);
		}
		15% {
			opacity: 1;
			transform: scale(1.1);
		}
		25% {
			transform: scale(1);
		}
		80% {
			opacity: 1;
			transform: scale(1);
		}
		100% {
			opacity: 0;
			transform: scale(0.9);
		}
	}
</style>
