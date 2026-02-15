<script lang="ts">
	import { page } from '$app/stores';
	import { settings, sidebarOpen, reader } from '$lib/stores';
	import { isSectionRead, calcChapterProgress, scrollProgress } from '$lib/stores/reader';
	import { onMount } from 'svelte';
	import type { TableOfContents, Chapter, Appendix } from '$lib/types/content';
	import { loadTableOfContents, getChapterPath, getSectionPath, findChapterBySlug } from '$lib/utils/contentLoader';
	import Skeleton from '$lib/components/Skeleton.svelte';

	export let bookSlug: string = '';
	export let hasPeriodicTable: boolean = false;

	let toc: TableOfContents | null = null;
	let manuallyToggledChapters: Set<number> = new Set();
	let appendicesExpanded = false;
	let answerKeyExpanded = false;

	// Get current route params
	$: chapterParam = $page.params.chapterSlug;
	$: sectionParam = $page.params.sectionSlug;

	// Subscribe to reader progress for reactivity
	$: progress = $reader.progress;

	// Load table of contents
	onMount(async () => {
		if (bookSlug) {
			try {
				toc = await loadTableOfContents(bookSlug);
			} catch (error) {
				console.error('Gat ekki hlaðið efnisyfirliti:', error);
			}
		}
	});

	// Calculate which chapters should be expanded
	$: expandedChapters = (() => {
		const expanded = new Set<number>();
		if (!toc) return expanded;

		const currentChapter = chapterParam ? findChapterBySlug(toc, chapterParam) : null;
		const currentChapterNumber = currentChapter?.number;
		const autoExpandChapter = currentChapterNumber ?? 1;

		if (!manuallyToggledChapters.has(autoExpandChapter)) {
			expanded.add(autoExpandChapter);
		}

		manuallyToggledChapters.forEach((chapterNumber) => {
			if (chapterNumber !== autoExpandChapter) {
				expanded.add(chapterNumber);
			}
		});

		return expanded;
	})();

	function toggleChapter(chapterNumber: number) {
		const newSet = new Set(manuallyToggledChapters);
		if (newSet.has(chapterNumber)) {
			newSet.delete(chapterNumber);
		} else {
			newSet.add(chapterNumber);
		}
		manuallyToggledChapters = newSet;
	}

	function closeSidebar() {
		settings.setSidebarOpen(false);
	}

	// Reactive helpers using subscribed progress (use chapter/section paths)
	function isRead(chapterPath: string, sectionPath: string): boolean {
		return isSectionRead(progress, chapterPath, sectionPath);
	}

	function getChapterProgressPercent(chapter: Chapter): number {
		return calcChapterProgress(progress, getChapterPath(chapter), chapter.sections.length);
	}
</script>

<!-- Overlay (backdrop) -->
<div
	class="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300 lg:hidden {$sidebarOpen
		? 'opacity-100'
		: 'pointer-events-none opacity-0'}"
	on:click={closeSidebar}
	on:keydown={(e) => e.key === 'Escape' && closeSidebar()}
	role="button"
	tabindex="-1"
	aria-hidden="true"
></div>

<!-- Sidebar -->
<aside
	aria-hidden={!$sidebarOpen ? 'true' : undefined}
	class="
    fixed
    inset-y-0 lg:top-[7rem] left-0
    z-50 lg:z-30
    w-80 bg-white dark:bg-gray-900
    transition-transform duration-300 ease-out
    overflow-y-auto
    lg:h-[calc(100vh-7rem)]
    {$sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
    lg:shadow-none
    lg:border-r lg:border-gray-200 dark:lg:border-gray-700
  "
>
	<div class="flex h-full flex-col">
		<!-- Sidebar header -->
		<div class="flex h-14 items-center justify-between border-b border-gray-100 dark:border-gray-800 px-4">
			<h2 class="font-semibold text-gray-900 dark:text-gray-100">Efnisyfirlit</h2>
			<button
				on:click={closeSidebar}
				class="rounded-lg p-2 -mr-2 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 lg:hidden"
				aria-label="Loka valmynd"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Sidebar content -->
		<nav class="flex-1 overflow-y-auto py-4" aria-label="Efnisyfirlit">
			{#if !toc}
				<Skeleton variant="sidebar" />
			{:else}
				<ul class="space-y-1 px-2">
					{#each toc.chapters as chapter (chapter.number)}
						{@const chapterPath = getChapterPath(chapter)}
						{@const progressPercent = getChapterProgressPercent(chapter)}
						{@const expanded = expandedChapters.has(chapter.number)}
						{@const isCurrentChapter = chapterParam === chapterPath || chapterParam === chapter.slug}
						<li>
							<!-- Chapter progress indicator -->
							{#if progressPercent > 0}
								<div class="mb-2 px-4">
									<div class="mb-2 flex items-center justify-between">
										<span class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
											{chapter.number}. kafli
										</span>
										<span class="text-xs font-medium text-emerald-600 dark:text-emerald-400">
											{progressPercent}%
										</span>
									</div>
									<div class="h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
										<div class="h-full rounded-full bg-emerald-500" style="width: {progressPercent}%"></div>
									</div>
								</div>
							{/if}

							<button
								on:click={() => toggleChapter(chapter.number)}
								aria-expanded={expanded}
								aria-controls="chapter-{chapter.number}-sections"
								class="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left font-medium text-gray-700 dark:text-gray-200 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
							>
								<span class="flex items-center gap-2">
									{#if expanded}
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
										</svg>
									{:else}
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
										</svg>
									{/if}
									<span>{chapter.number}. {chapter.title}</span>
								</span>
							</button>

							<!-- Sections -->
							{#if expanded}
								<ul id="chapter-{chapter.number}-sections" class="mt-1 space-y-1">
									{#each chapter.sections as section (section.file)}
										{@const sectionPath = getSectionPath(section)}
										{@const isCurrent = isCurrentChapter && (sectionParam === sectionPath || sectionParam === section.slug)}
										{@const isReadSection = isRead(chapterPath, sectionPath)}
										{@const readingTime = section.metadata?.readingTime}
										<li>
											<a
												href="/{bookSlug}/kafli/{chapterPath}/{sectionPath}"
												class="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors {isCurrent
													? 'bg-blue-50 dark:bg-blue-900/30 font-medium text-blue-700 dark:text-blue-300'
													: 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}"
											>
												{#if isReadSection}
													<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
														<svg class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
														</svg>
													</span>
												{:else if isCurrent}
													<!-- Scroll progress ring for current section -->
													<span class="relative flex h-6 w-6 shrink-0 items-center justify-center">
														<svg class="absolute w-6 h-6 -rotate-90" viewBox="0 0 24 24">
															<circle
																cx="12" cy="12" r="10"
																fill="none"
																stroke="currentColor"
																stroke-width="2"
																class="text-blue-100 dark:text-blue-900/50"
															/>
															<circle
																cx="12" cy="12" r="10"
																fill="none"
																stroke="currentColor"
																stroke-width="2"
																stroke-dasharray="62.83"
																stroke-dashoffset={62.83 - (62.83 * $scrollProgress / 100)}
																stroke-linecap="round"
																class="text-blue-500 dark:text-blue-400 transition-[stroke-dashoffset] duration-150"
															/>
														</svg>
														<span class="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400"></span>
													</span>
												{:else}
													<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
														<span class="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-500"></span>
													</span>
												{/if}
												<div class="flex-1 min-w-0">
													<span class="text-sm block truncate">{section.number} {section.title}</span>
													{#if readingTime && !isReadSection}
														<span class="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
															<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
															</svg>
															{readingTime} mín
														</span>
													{/if}
												</div>
											</a>
										</li>
									{/each}
								</ul>
							{/if}
						</li>
					{/each}
				</ul>

				<!-- Appendices section -->
				{#if toc.appendices && toc.appendices.length > 0}
					<div class="mt-4 px-2">
						<button
							on:click={() => appendicesExpanded = !appendicesExpanded}
							aria-expanded={appendicesExpanded}
							aria-controls="appendices-list"
							class="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left font-medium text-gray-700 dark:text-gray-200 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
						>
							<span class="flex items-center gap-2">
								{#if appendicesExpanded}
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
									</svg>
								{:else}
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
									</svg>
								{/if}
								<span>Viðaukar</span>
							</span>
						</button>

						{#if appendicesExpanded}
							<ul id="appendices-list" class="mt-1 space-y-1">
								{#each toc.appendices as appendix (appendix.letter)}
									{@const href = appendix.isInteractive && appendix.componentPath
										? `/${bookSlug}${appendix.componentPath}`
										: `/${bookSlug}/vidauki/${appendix.letter}`}
									<li>
										<a
											{href}
											class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
										>
											<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300">
												{appendix.letter}
											</span>
											<span class="text-sm">{appendix.title}</span>
										</a>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/if}

				<!-- Answer Key section -->
				{#if toc.answerKey && toc.answerKey.length > 0}
					<div class="mt-4 px-2">
						<button
							on:click={() => answerKeyExpanded = !answerKeyExpanded}
							aria-expanded={answerKeyExpanded}
							aria-controls="answer-key-list"
							class="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left font-medium text-gray-700 dark:text-gray-200 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
						>
							<span class="flex items-center gap-2">
								{#if answerKeyExpanded}
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
									</svg>
								{:else}
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
									</svg>
								{/if}
								<span>Svarlykill</span>
							</span>
						</button>

						{#if answerKeyExpanded}
							<ul id="answer-key-list" class="mt-1 space-y-1">
								{#each toc.answerKey as entry (entry.chapter)}
									<li>
										<a
											href="/{bookSlug}/svarlykill/{entry.chapter}"
											class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
										>
											<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300">
												{entry.chapter}
											</span>
											<span class="text-sm">{entry.title}</span>
										</a>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/if}

				<!-- Study tools section -->
				<div class="mt-6 space-y-1 border-t border-gray-100 dark:border-gray-800 px-2 pt-4">
					<h3 class="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
						Námsverkfæri
					</h3>
					<a
						href="/{bookSlug}/nam"
						class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span class="text-sm">Námslota</span>
					</a>
					<a
						href="/{bookSlug}/ordabok"
						class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
						</svg>
						<span class="text-sm">Orðasafn</span>
					</a>
					<a
						href="/{bookSlug}/minniskort"
						class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
						</svg>
						<span class="text-sm">Minniskort</span>
					</a>
					<a
						href="/{bookSlug}/aefingar"
						class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
						</svg>
						<span class="text-sm">Æfingadæmi</span>
					</a>
					<a
						href="/{bookSlug}/markmid"
						class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span class="text-sm">Námsmarkmið</span>
					</a>
					<a
						href="/{bookSlug}/greining"
						class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
						</svg>
						<span class="text-sm">Námsgreining</span>
					</a>
					<a
						href="/{bookSlug}/bokamerki"
						class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
						</svg>
						<span class="text-sm">Bókamerki</span>
					</a>
					{#if hasPeriodicTable}
						<a
							href="/{bookSlug}/lotukerfi"
							class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<circle cx="12" cy="12" r="3" stroke-width="2" />
								<ellipse cx="12" cy="12" rx="9" ry="4" stroke-width="2" />
								<ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(60 12 12)" stroke-width="2" />
								<ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(120 12 12)" stroke-width="2" />
							</svg>
							<span class="text-sm">Lotukerfi</span>
						</a>
					{/if}
				</div>
			{/if}
		</nav>
	</div>
</aside>
