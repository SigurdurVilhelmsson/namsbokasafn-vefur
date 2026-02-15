<!--
  Section View Page - Renders a book section with markdown content
-->
<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { beforeNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import type { PageData } from './$types';
	import { reader, analyticsStore, objectivesStore } from '$lib/stores';
	import { isSectionRead, isSectionBookmarked, getSavedScrollPosition, type ScrollPositions } from '$lib/stores/reader';
	import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';
	import NavigationButtons from '$lib/components/NavigationButtons.svelte';
	import TextHighlighter from '$lib/components/TextHighlighter.svelte';
	import AnnotationSidebar from '$lib/components/AnnotationSidebar.svelte';
	import PilotBanner from '$lib/components/PilotBanner.svelte';
	import { readDetection } from '$lib/actions/readDetection';
	import { fade, fly } from 'svelte/transition';

	export let data: PageData;

	let showAnnotationSidebar = false;
	let shareSuccess = false;
	let shareTimeout: ReturnType<typeof setTimeout>;
	let showCompletionAnimation = false;
	let completionTimeout: ReturnType<typeof setTimeout>;
	let showContinuePrompt = false;
	let savedPosition: { scrollY: number; percentage: number } | null = null;
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
	$: progress = $reader.progress;
	$: bookmarks = $reader.bookmarks;

	// Track scroll progress
	function handleScroll() {
		const scrollTop = window.scrollY;
		const docHeight = document.documentElement.scrollHeight - window.innerHeight;
		if (docHeight > 0) {
			const progress = Math.round((scrollTop / docHeight) * 100);
			reader.setScrollProgress(progress);
		}
	}

	// Mark section as read and start analytics session
	onMount(() => {
		reader.setCurrentLocation(data.chapterSlug, data.sectionSlug);
		reader.setScrollProgress(0); // Reset scroll progress
		analyticsStore.startReadingSession(data.bookSlug, data.chapterSlug, data.sectionSlug);

		// Check for saved scroll position
		const saved = reader.getScrollPosition(data.chapterSlug, data.sectionSlug);
		if (saved && saved.percentage > 10) {
			// Only show prompt if user was past 10% of the document
			savedPosition = { scrollY: saved.scrollY, percentage: saved.percentage };
			showContinuePrompt = true;
			// Auto-hide the prompt after 8 seconds
			continuePromptTimeout = setTimeout(() => {
				showContinuePrompt = false;
			}, 8000);
		}

		// Add scroll listener
		window.addEventListener('scroll', handleScroll, { passive: true });

		return () => {
			window.removeEventListener('scroll', handleScroll);
			clearTimeout(continuePromptTimeout);
		};
	});

	// Save scroll position before navigating away
	beforeNavigate(() => {
		if (browser) {
			const scrollTop = window.scrollY;
			const docHeight = document.documentElement.scrollHeight - window.innerHeight;
			const percentage = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
			reader.saveScrollPosition(data.chapterSlug, data.sectionSlug, scrollTop, percentage);
		}
	});

	// End analytics session when leaving
	onDestroy(() => {
		analyticsStore.endReadingSession();
		clearTimeout(continuePromptTimeout);
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
		reader.clearScrollPosition(data.chapterSlug, data.sectionSlug);
	}

	function markAsRead() {
		const wasAlreadyRead = isSectionRead(progress, data.chapterSlug, data.sectionSlug);
		reader.markAsRead(data.chapterSlug, data.sectionSlug);

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
	$: isRead = isSectionRead(progress, data.chapterSlug, data.sectionSlug);
	$: isBookmarked = isSectionBookmarked(bookmarks, data.chapterSlug, data.sectionSlug);

	function toggleBookmark() {
		reader.toggleBookmark(data.chapterSlug, data.sectionSlug);
	}

	// Objectives tracking
	function toggleObjective(index: number, text: string) {
		objectivesStore.toggleObjective(data.chapterSlug, data.sectionSlug, index, text);
		analyticsStore.logActivity('objective', {
			bookSlug: data.bookSlug,
			chapterSlug: data.chapterSlug,
			sectionSlug: data.sectionSlug,
			action: objectivesStore.isObjectiveCompleted(data.chapterSlug, data.sectionSlug, index) ? 'completed' : 'uncompleted'
		});
	}

	function isObjectiveCompleted(index: number): boolean {
		return objectivesStore.isObjectiveCompleted(data.chapterSlug, data.sectionSlug, index);
	}

	// Reactive: track objectives state
	$: objectivesState = $objectivesStore.completedObjectives;
</script>

<svelte:head>
	<title>{data.section.section} {data.section.title} | Námsbókasafn</title>
</svelte:head>

<article class="max-w-3xl mx-auto px-1 sm:px-0">
	<!-- Continue where you left off prompt -->
	{#if showContinuePrompt && savedPosition}
		<div
			class="mb-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
			role="alert"
			aria-live="polite"
			transition:fly={{ y: -20, duration: 300 }}
		>
			<div class="flex items-center gap-3">
				<div class="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
					<svg class="w-5 h-5 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
					</svg>
				</div>
				<div>
					<p class="font-medium text-blue-900 dark:text-blue-100">Haltu áfram að lesa</p>
					<p class="text-sm text-blue-700 dark:text-blue-300">
						Þú varst komin(n) {savedPosition.percentage}% í gegnum þennan kafla
					</p>
				</div>
			</div>
			<div class="flex items-center gap-2 w-full sm:w-auto">
				<button
					on:click={handleContinueReading}
					class="flex-1 sm:flex-initial px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
				>
					Halda áfram
				</button>
				<button
					on:click={dismissContinuePrompt}
					class="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-lg transition-colors"
					aria-label="Hunsa"
					title="Byrja frá byrjun"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>
	{/if}

	<!-- Pilot status banner -->
	<PilotBanner />

	<!-- Reading progress bar -->
	<div class="mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-2">
		<div class="flex items-center gap-2 sm:gap-3">
			{#if data.section.readingTime}
				<span class="inline-flex items-center gap-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
					<svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
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
				on:click={handlePrint}
				class="p-2 rounded-lg transition-colors text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200"
				aria-label="Prenta kafla"
				title="Prenta"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
				</svg>
			</button>
			<!-- Share button -->
			<button
				on:click={handleShare}
				class="p-2 rounded-lg transition-colors {shareSuccess
					? 'text-green-500 bg-green-50 dark:bg-green-900/20'
					: 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-500'}"
				aria-label={shareSuccess ? 'Hlekkur afritaður' : 'Deila kafla'}
				title={shareSuccess ? 'Hlekkur afritaður!' : 'Deila'}
			>
				{#if shareSuccess}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
				{:else}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
					</svg>
				{/if}
			</button>
			<!-- Annotations button -->
			<button
				on:click={() => (showAnnotationSidebar = true)}
				class="p-2 rounded-lg transition-colors text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-500"
				aria-label="Opna athugasemdir"
				title="Athugasemdir"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
				</svg>
			</button>
			<button
				on:click={toggleBookmark}
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
					on:click={markAsRead}
					class="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
					aria-label="Merkja sem lesið"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
					<span class="hidden sm:inline">Merkja sem lesið</span>
				</button>
			{:else}
				<span class="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
					<span class="hidden sm:inline">Lesið</span>
				</span>
			{/if}
		</div>
	</div>

	<!-- Learning Objectives -->
	{#if data.section.objectives && data.section.objectives.length > 0}
		{@const completedCount = data.section.objectives.filter((_, i) => isObjectiveCompleted(i)).length}
		<div class="mb-8 p-6 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
			<div class="flex items-center justify-between mb-3">
				<h3 class="text-lg font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
					</svg>
					Námsmarkmið
				</h3>
				{#if completedCount > 0}
					<span class="text-sm text-blue-700 dark:text-blue-300">
						{completedCount}/{data.section.objectives.length} kláruð
					</span>
				{/if}
			</div>
			<p class="text-sm text-blue-800 dark:text-blue-200 mb-3">
				Eftir að hafa lesið þennan kafla ættirðu að geta:
			</p>
			<ul class="space-y-2">
				{#each data.section.objectives as objective, i (i)}
					{@const completed = isObjectiveCompleted(i)}
					<li class="flex items-start gap-3 text-blue-800 dark:text-blue-200">
						<button
							on:click={() => toggleObjective(i, objective)}
							class="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors {completed
								? 'bg-green-500 border-green-500 text-white'
								: 'border-blue-300 dark:border-blue-600 hover:border-green-400 dark:hover:border-green-500'}"
							aria-label={completed ? 'Afmerkja markmið' : 'Merkja markmið sem kláruð'}
						>
							{#if completed}
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
							{:else}
								<span class="text-xs font-medium text-blue-600 dark:text-blue-400">{i + 1}</span>
							{/if}
						</button>
						<span class="{completed ? 'line-through opacity-70' : ''}">{objective}</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- Main content wrapped in TextHighlighter for annotation support -->
	<TextHighlighter
		bookSlug={data.bookSlug}
		chapterSlug={data.chapterSlug}
		sectionSlug={data.sectionSlug}
	>
		<MarkdownRenderer
			content={data.section.content}
			bookSlug={data.bookSlug}
			chapterSlug={data.chapterSlug}
			sectionSlug={data.sectionSlug}
			chapterNumber={data.chapterNumber}
			sectionType={data.section.type || ''}
			isHtml={data.section.isHtml || false}
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

	<!-- Mark as read button at bottom -->
	{#if !isRead}
		<div class="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
			<button
				on:click={markAsRead}
				class="inline-flex items-center gap-2 px-6 py-3 text-lg font-medium rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
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
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
			</svg>
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
