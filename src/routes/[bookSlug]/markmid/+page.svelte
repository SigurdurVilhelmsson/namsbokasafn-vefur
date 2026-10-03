<!--
  Learning Objectives Page - Track and manage learning objectives
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { PageData } from './$types';
	import type { TableOfContents } from '$lib/types/content';
	import { objectivesStore, type ConfidenceLevel } from '$lib/stores/objectives';
	import { loadTableOfContents, findChapterBySlug, findSectionBySlug } from '$lib/utils/contentLoader';
	import { countBookObjectives, coverage } from '$lib/utils/objectivesProgress';
	import Skeleton from '$lib/components/Skeleton.svelte';

	let { data }: { data: PageData } = $props();

	// Only this book's objectives: stored values carry chapter/section slugs
	// shared across books, but the record keys are book-prefixed
	let bookObjectives = $derived(
		Object.entries($objectivesStore.completedObjectives)
			.filter(([key]) => key.startsWith(`${data.bookSlug}/`))
			.map(([, value]) => value)
	);
	let completedCount = $derived(bookObjectives.filter((o) => o.isCompleted).length);
	let lowConfidenceObjectives = $derived(
		bookObjectives.filter((o) => o.confidence !== undefined && o.confidence <= 2)
	);

	let toc: TableOfContents | null = $state(null);
	let loading = $state(true);

	onMount(async () => {
		try {
			toc = await loadTableOfContents(data.bookSlug);
		} catch (e) {
			console.error('Failed to load TOC:', e);
		} finally {
			loading = false;
		}
	});

	// Confidence level labels in Icelandic
	const confidenceLabels: Record<ConfidenceLevel, string> = {
		1: 'Mjög óviss',
		2: 'Óviss',
		3: 'Hlutlaus',
		4: 'Nokkuð viss',
		5: 'Mjög viss'
	};

	const confidenceColors: Record<ConfidenceLevel, string> = {
		1: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
		2: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
		3: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
		4: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
		5: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
	};

	// Get section title from TOC (supports both v1 slugs and v2 numbers)
	function getSectionInfo(chapterSlug: string, sectionSlug: string): { chapterTitle: string; sectionTitle: string; sectionNumber: string } | null {
		if (!toc) return null;
		const result = findSectionBySlug(toc, chapterSlug, sectionSlug);
		if (!result) return null;
		return {
			chapterTitle: `${result.chapter.number}. ${result.chapter.title}`,
			sectionTitle: result.section.title,
			sectionNumber: result.section.number
		};
	}

	// Group objectives by chapter
	let objectivesByChapter = $derived.by(() => {
		const grouped = new Map<string, typeof bookObjectives>();

		for (const objective of bookObjectives) {
			const key = objective.chapterSlug;
			if (!grouped.has(key)) {
				grouped.set(key, []);
			}
			grouped.get(key)!.push(objective);
		}

		// Sort by chapter slug (which usually has numeric prefix)
		return new Map([...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0])));
	});

	// Get chapter info from TOC (supports both v1 slugs and v2 numbers)
	function getChapterTitle(chapterSlug: string): string {
		if (!toc) return chapterSlug;
		const chapter = findChapterBySlug(toc, chapterSlug);
		return chapter ? `${chapter.number}. ${chapter.title}` : chapterSlug;
	}

	// Coverage bar: assessed objectives vs real book total
	let totalObjectives = $derived(toc ? countBookObjectives(toc) : 0);
	let coverageResult = $derived(coverage(completedCount, totalObjectives));

	// Count by confidence level
	let confidenceCounts = $derived.by(() => {
		const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, unrated: 0 };
		for (const obj of bookObjectives) {
			if (obj.confidence) {
				counts[obj.confidence]++;
			} else {
				counts.unrated++;
			}
		}
		return counts;
	});

	function toggleObjective(chapterSlug: string, sectionSlug: string, index: number, text: string) {
		objectivesStore.toggleObjective(data.bookSlug, chapterSlug, sectionSlug, index, text);
	}

	function setConfidence(chapterSlug: string, sectionSlug: string, index: number, level: ConfidenceLevel) {
		objectivesStore.setObjectiveConfidence(data.bookSlug, chapterSlug, sectionSlug, index, level);
	}

	function clearAllObjectives() {
		if (confirm('Ertu viss um að þú viljir eyða öllum námsmarkmiðum? Þetta er ekki hægt að afturkalla.')) {
			objectivesStore.reset();
		}
	}
</script>

<svelte:head>
	<title>Námsmarkmið | {data.book?.title ?? 'Bók'}</title>
	<meta property="og:title" content="Námsmarkmið | {data.book?.title ?? 'Bók'}" />
	<meta property="og:description" content="Námsmarkmið og yfirsýn yfir kafla í {data.book?.title ?? 'kennslubók'}" />
	<meta property="og:type" content="website" />
	<link rel="canonical" href="https://namsbokasafn.is/{data.bookSlug}/markmid" />
	<meta property="og:url" content="https://namsbokasafn.is/{data.bookSlug}/markmid" />
</svelte:head>

<div class="max-w-4xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
			Námsmarkmið
		</h1>
		{#if completedCount > 0}
			<button
				onclick={clearAllObjectives}
				class="text-sm px-3 py-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
			>
				Hreinsa öll
			</button>
		{/if}
	</div>

	{#if loading}
		<div class="space-y-4">
			<Skeleton variant="card" />
			<Skeleton variant="card" />
		</div>
	{:else}
		<!-- Progress Overview -->
		<div class="mb-8 p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Framvinda</h2>
				<span class="text-2xl font-bold text-[var(--accent-color)]">{completedCount}</span>
			</div>

			{#if completedCount === 0}
				<p class="text-gray-500 dark:text-gray-400 text-sm">
					Engin námsmarkmið skráð enn. Farðu í kafla til að sjá og merkja námsmarkmið.
				</p>
			{:else}
				<!-- Coverage bar (assessed of all objectives in the book) -->
				{#if totalObjectives > 0}
				<div class="mb-4">
					<div class="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
						<span>Metin markmið</span>
						<span>{Math.min(coverageResult.completed, coverageResult.total)}/{coverageResult.total}</span>
					</div>
					<div class="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
						<div class="h-full bg-green-500 rounded-full transition-all duration-300"
							style="width: {Math.min(coverageResult.percentage, 100)}%"></div>
					</div>
				</div>
				{/if}

				<!-- Confidence distribution -->
				<div class="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
					{#each [1, 2, 3, 4, 5] as level (level)}
						{@const lvl = level as ConfidenceLevel}
						<div class="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
							<div class="text-lg font-semibold text-gray-900 dark:text-gray-100">{confidenceCounts[lvl]}</div>
							<div class="text-xs text-gray-500 dark:text-gray-400">{confidenceLabels[lvl]}</div>
						</div>
					{/each}
					<div class="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
						<div class="text-lg font-semibold text-gray-900 dark:text-gray-100">{confidenceCounts.unrated}</div>
						<div class="text-xs text-gray-500 dark:text-gray-400">Ómetið</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Low Confidence Section -->
		{#if lowConfidenceObjectives.length > 0}
			<div class="mb-8 p-6 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
				<h2 class="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-3 flex items-center gap-2">
					<Icon name="triangle-alert" />
					Þarfnast endurskoðunar
				</h2>
				<p class="text-sm text-amber-800 dark:text-amber-200 mb-4">
					Þessi markmið eru merkt með lágri sjálfsvissu. Íhugaðu að fara aftur í viðkomandi kafla.
				</p>
				<div class="space-y-2">
					{#each lowConfidenceObjectives as obj (`${obj.chapterSlug}-${obj.sectionSlug}-${obj.objectiveIndex}`)}
						{@const info = getSectionInfo(obj.chapterSlug, obj.sectionSlug)}
						<a
							href="/{data.bookSlug}/kafli/{obj.chapterSlug}/{obj.sectionSlug}"
							class="block p-3 rounded-lg bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-700 hover:border-amber-400 dark:hover:border-amber-500 transition-colors"
						>
							<p class="text-sm font-medium text-gray-900 dark:text-gray-100">{obj.objectiveText}</p>
							{#if info}
								<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
									{info.sectionNumber} {info.sectionTitle}
								</p>
							{/if}
						</a>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Empty state -->
		{#if completedCount === 0}
			<div class="text-center py-16">
				<svg
					class="w-20 h-20 mx-auto text-gray-300 dark:text-gray-600 mb-6"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
				</svg>
				<h2 class="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">
					Engin námsmarkmið merkt
				</h2>
				<p class="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
					Námsmarkmið birtast efst í hverjum kafla. Merktu þau sem þú hefur náð til að fylgjast með framvindu þinni.
				</p>
				<a
					href="/{data.bookSlug}"
					class="btn-accent"
				>
					<Icon name="book-open" />
					Fara í efnisyfirlit
				</a>
			</div>
		{:else}
			<!-- Objectives by Chapter -->
			<div class="space-y-6">
				{#each [...objectivesByChapter.entries()] as [chapterSlug, objectives] (chapterSlug)}
					<div class="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
						<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
							{getChapterTitle(chapterSlug)}
						</h2>
						<div class="space-y-4">
							{#each objectives.sort((a, b) => a.objectiveIndex - b.objectiveIndex) as obj (`${obj.chapterSlug}-${obj.sectionSlug}-${obj.objectiveIndex}`)}
								{@const info = getSectionInfo(obj.chapterSlug, obj.sectionSlug)}
								<div class="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600">
									<div class="flex items-start gap-3">
										<!-- Checkbox -->
										<button
											onclick={() => toggleObjective(obj.chapterSlug, obj.sectionSlug, obj.objectiveIndex, obj.objectiveText)}
											class="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors {obj.isCompleted
												? 'bg-green-500 border-green-500 text-white'
												: 'border-gray-300 dark:border-gray-500 hover:border-green-400'}"
											aria-label={obj.isCompleted ? 'Afmerkja sem ókláruð' : 'Merkja sem kláruð'}
										>
											{#if obj.isCompleted}
												<Icon name="check" size="sm" />
											{/if}
										</button>

										<!-- Content -->
										<div class="flex-1 min-w-0">
											<p class="text-sm font-medium text-gray-900 dark:text-gray-100 {obj.isCompleted ? '' : 'opacity-70'}">
												{obj.objectiveText}
											</p>
											{#if info}
												<a
													href="/{data.bookSlug}/kafli/{obj.chapterSlug}/{obj.sectionSlug}"
													class="text-xs text-[var(--accent-color)] hover:underline mt-1 inline-block"
												>
													{info.sectionNumber} {info.sectionTitle}
												</a>
											{/if}

											<!-- Confidence selector -->
											{#if obj.isCompleted}
												<div class="mt-3 flex flex-wrap gap-1">
													<span class="text-xs text-gray-500 dark:text-gray-400 mr-2 self-center">Sjálfsvissa:</span>
													{#each [1, 2, 3, 4, 5] as level (level)}
														<button
															onclick={() => setConfidence(obj.chapterSlug, obj.sectionSlug, obj.objectiveIndex, level as ConfidenceLevel)}
															class="px-2 py-1 text-xs rounded border transition-colors {obj.confidence === level
																? confidenceColors[level as ConfidenceLevel]
																: 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-500 hover:bg-gray-200 dark:hover:bg-gray-500'}"
														>
															{level}
														</button>
													{/each}
												</div>
											{/if}
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Help text -->
		<div class="mt-8 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
			<h3 class="font-medium text-blue-900 dark:text-blue-100 mb-2">Um námsmarkmið</h3>
			<p class="text-sm text-blue-800 dark:text-blue-200">
				Námsmarkmið hjálpa þér að fylgjast með hvað þú hefur lært. Þegar þú hefur lesið kafla og skilur efnið,
				merktu viðeigandi markmið sem kláruð. Notaðu sjálfsvissumatið til að bera kennsl á svæði sem þarfnast meiri athygli.
			</p>
		</div>
	{/if}
</div>
