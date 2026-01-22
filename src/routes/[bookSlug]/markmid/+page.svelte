<!--
  Learning Objectives Page - Track and manage learning objectives
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import type { TableOfContents } from '$lib/types/content';
	import {
		objectivesStore,
		totalCompletedObjectives,
		objectivesWithLowConfidence,
		type ConfidenceLevel
	} from '$lib/stores/objectives';
	import { loadTableOfContents, findChapterBySlug, findSectionBySlug } from '$lib/utils/contentLoader';
	import Skeleton from '$lib/components/Skeleton.svelte';

	export let data: PageData;

	let toc: TableOfContents | null = null;
	let loading = true;

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
	$: objectivesByChapter = (() => {
		const grouped = new Map<string, typeof $objectivesStore.completedObjectives[string][]>();

		for (const objective of Object.values($objectivesStore.completedObjectives)) {
			const key = objective.chapterSlug;
			if (!grouped.has(key)) {
				grouped.set(key, []);
			}
			grouped.get(key)!.push(objective);
		}

		// Sort by chapter slug (which usually has numeric prefix)
		return new Map([...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0])));
	})();

	// Get chapter info from TOC (supports both v1 slugs and v2 numbers)
	function getChapterTitle(chapterSlug: string): string {
		if (!toc) return chapterSlug;
		const chapter = findChapterBySlug(toc, chapterSlug);
		return chapter ? `${chapter.number}. ${chapter.title}` : chapterSlug;
	}

	// Calculate progress percentage
	$: progressPercent = (() => {
		const total = Object.keys($objectivesStore.completedObjectives).length;
		const completed = Object.values($objectivesStore.completedObjectives).filter(o => o.isCompleted).length;
		return total > 0 ? Math.round((completed / total) * 100) : 0;
	})();

	// Count by confidence level
	$: confidenceCounts = (() => {
		const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, unrated: 0 };
		for (const obj of Object.values($objectivesStore.completedObjectives)) {
			if (obj.confidence) {
				counts[obj.confidence]++;
			} else {
				counts.unrated++;
			}
		}
		return counts;
	})();

	function toggleObjective(chapterSlug: string, sectionSlug: string, index: number, text: string) {
		objectivesStore.toggleObjective(chapterSlug, sectionSlug, index, text);
	}

	function setConfidence(chapterSlug: string, sectionSlug: string, index: number, level: ConfidenceLevel) {
		objectivesStore.setObjectiveConfidence(chapterSlug, sectionSlug, index, level);
	}

	function clearAllObjectives() {
		if (confirm('Ertu viss um að þú viljir eyða öllum námsmarkmiðum? Þetta er ekki hægt að afturkalla.')) {
			objectivesStore.reset();
		}
	}
</script>

<svelte:head>
	<title>Námsmarkmið | {data.book?.title ?? 'Bók'}</title>
</svelte:head>

<div class="max-w-4xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
			Námsmarkmið
		</h1>
		{#if $totalCompletedObjectives > 0}
			<button
				on:click={clearAllObjectives}
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
				<span class="text-2xl font-bold text-blue-600 dark:text-blue-400">{$totalCompletedObjectives}</span>
			</div>

			{#if $totalCompletedObjectives === 0}
				<p class="text-gray-500 dark:text-gray-400 text-sm">
					Engin námsmarkmið skráð enn. Farðu í kafla til að sjá og merkja námsmarkmið.
				</p>
			{:else}
				<!-- Progress bar -->
				<div class="mb-4">
					<div class="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
						<span>Kláruð markmið</span>
						<span>{progressPercent}%</span>
					</div>
					<div class="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
						<div
							class="h-full bg-green-500 rounded-full transition-all duration-300"
							style="width: {progressPercent}%"
						></div>
					</div>
				</div>

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
		{#if $objectivesWithLowConfidence.length > 0}
			<div class="mb-8 p-6 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
				<h2 class="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-3 flex items-center gap-2">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
					Þarfnast endurskoðunar
				</h2>
				<p class="text-sm text-amber-800 dark:text-amber-200 mb-4">
					Þessi markmið eru merkt með lágri sjálfsvissu. Íhugaðu að fara aftur í viðkomandi kafla.
				</p>
				<div class="space-y-2">
					{#each $objectivesWithLowConfidence as obj}
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
		{#if $totalCompletedObjectives === 0}
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
					class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
					</svg>
					Fara í efnisyfirlit
				</a>
			</div>
		{:else}
			<!-- Objectives by Chapter -->
			<div class="space-y-6">
				{#each [...objectivesByChapter.entries()] as [chapterSlug, objectives]}
					<div class="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
						<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
							{getChapterTitle(chapterSlug)}
						</h2>
						<div class="space-y-4">
							{#each objectives.sort((a, b) => a.objectiveIndex - b.objectiveIndex) as obj}
								{@const info = getSectionInfo(obj.chapterSlug, obj.sectionSlug)}
								<div class="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600">
									<div class="flex items-start gap-3">
										<!-- Checkbox -->
										<button
											on:click={() => toggleObjective(obj.chapterSlug, obj.sectionSlug, obj.objectiveIndex, obj.objectiveText)}
											class="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors {obj.isCompleted
												? 'bg-green-500 border-green-500 text-white'
												: 'border-gray-300 dark:border-gray-500 hover:border-green-400'}"
											aria-label={obj.isCompleted ? 'Afmerkja sem ókláruð' : 'Merkja sem kláruð'}
										>
											{#if obj.isCompleted}
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
												</svg>
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
													class="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block"
												>
													{info.sectionNumber} {info.sectionTitle}
												</a>
											{/if}

											<!-- Confidence selector -->
											{#if obj.isCompleted}
												<div class="mt-3 flex flex-wrap gap-1">
													<span class="text-xs text-gray-500 dark:text-gray-400 mr-2 self-center">Sjálfsvissa:</span>
													{#each [1, 2, 3, 4, 5] as level}
														<button
															on:click={() => setConfidence(obj.chapterSlug, obj.sectionSlug, obj.objectiveIndex, level as ConfidenceLevel)}
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
