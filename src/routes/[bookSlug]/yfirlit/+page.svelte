<!--
  Quick Review (Yfirlit) Page
  Displays key concepts, definitions, learning objectives, and checkpoints
  extracted from chapter content as summary cards for quick review.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import type { TableOfContents, Chapter, Section } from '$lib/types/content';
	import { loadTableOfContents, getChapterFolder, getChapterPath, getSectionPath } from '$lib/utils/contentLoader';
	import { extractReviewBlocks, type ReviewBlock } from '$lib/utils/reviewExtractor';
	import Skeleton from '$lib/components/Skeleton.svelte';

	export let data: PageData;

	/** Icelandic labels for block types */
	const TYPE_LABELS: Record<string, string> = {
		'key-concept': 'Lykilhugtak',
		'definition': 'Skilgreining',
		'learning-objectives': 'Námsmarkmið',
		'checkpoint': 'Eftirlitsatriði'
	};

	/** Color classes for block type badges */
	const TYPE_COLORS: Record<string, string> = {
		'key-concept': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
		'definition': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
		'learning-objectives': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
		'checkpoint': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
	};

	interface SectionGroup {
		chapter: Chapter;
		section: Section;
		blocks: ReviewBlock[];
	}

	let toc: TableOfContents | null = null;
	let loadingToc = true;
	let loadingBlocks = false;
	let error: string | null = null;
	let selectedChapterIndex: number | null = null;
	let hasSelected = false;
	let sectionGroups: SectionGroup[] = [];

	onMount(async () => {
		try {
			toc = await loadTableOfContents(data.bookSlug);
		} catch (e) {
			error = 'Gat ekki hlaðið efnisyfirliti';
			console.error(e);
		} finally {
			loadingToc = false;
		}
	});

	/**
	 * Select a chapter (or all chapters) and fetch review blocks
	 */
	async function selectChapter(index: number | null): Promise<void> {
		if (hasSelected && selectedChapterIndex === index) return;
		selectedChapterIndex = index;
		hasSelected = true;
		sectionGroups = [];

		if (!toc) return;

		const chapters = index === null
			? toc.chapters
			: [toc.chapters[index]];

		loadingBlocks = true;
		error = null;

		try {
			const groups: SectionGroup[] = [];

			for (const chapter of chapters) {
				const chapterFolder = getChapterFolder(chapter);

				for (const section of chapter.sections) {
					try {
						const response = await fetch(
							`/content/${data.bookSlug}/chapters/${chapterFolder}/${section.file}`
						);
						if (!response.ok) continue;

						const html = await response.text();
						const blocks = extractReviewBlocks(html);

						if (blocks.length > 0) {
							groups.push({ chapter, section, blocks });
						}
					} catch {
						// Skip sections that fail to load
						continue;
					}
				}
			}

			sectionGroups = groups;
		} catch (e) {
			error = 'Villa við að sækja efni';
			console.error(e);
		} finally {
			loadingBlocks = false;
		}
	}

	/**
	 * Build the URL for a section within its chapter
	 */
	function sectionUrl(chapter: Chapter, section: Section): string {
		const chapterPath = getChapterPath(chapter);
		const sectionPath = getSectionPath(section);
		return `/${data.bookSlug}/kafli/${chapterPath}/${sectionPath}`;
	}

	/**
	 * Build a breadcrumb label for a section: "Kafli X > Y.Z Title"
	 */
	function sectionBreadcrumb(chapter: Chapter, section: Section): string {
		const sectionLabel = section.number
			? `${section.number} ${section.title}`
			: section.title;
		return `Kafli ${chapter.number} > ${sectionLabel}`;
	}

	$: showEmpty = hasSelected && !loadingBlocks && sectionGroups.length === 0 && !error;
</script>

<svelte:head>
	<title>Yfirlit | {data.book?.title ?? 'Bók'}</title>
</svelte:head>

<div class="max-w-4xl mx-auto">
	<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
		Yfirlit
	</h1>
	<p class="text-gray-600 dark:text-gray-400 mb-6">
		Lykilhugtök, skilgreiningar og eftirlitsatriði úr kaflanum — tilvalið til yfirlestrar.
	</p>

	{#if loadingToc}
		<Skeleton variant="content" />
	{:else if error && !toc}
		<div class="rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
			<p class="text-red-600 dark:text-red-400">{error}</p>
		</div>
	{:else if toc}
		<!-- Chapter picker chips -->
		<div
			class="flex gap-2 mb-8 overflow-x-auto pb-2 -mx-1 px-1"
			role="tablist"
			aria-label="Veldu kafla"
		>
			<button
				role="tab"
				aria-selected={selectedChapterIndex === null && hasSelected}
				class="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap
					{selectedChapterIndex === null && hasSelected
						? 'bg-blue-600 text-white'
						: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}"
				on:click={() => selectChapter(null)}
			>
				Allir kaflar
			</button>
			{#each toc.chapters as chapter, i (chapter.number)}
				<button
					role="tab"
					aria-selected={selectedChapterIndex === i}
					class="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap
						{selectedChapterIndex === i
							? 'bg-blue-600 text-white'
							: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}"
					on:click={() => selectChapter(i)}
				>
					Kafli {chapter.number}
				</button>
			{/each}
		</div>

		<!-- States -->
		{#if !hasSelected && !loadingBlocks}
			<!-- Initial: no chapter selected -->
			<div class="text-center py-16">
				<svg class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
						d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
				</svg>
				<p class="text-gray-500 dark:text-gray-400 text-lg">Veldu kafla til að byrja</p>
			</div>
		{:else if loadingBlocks}
			<!-- Loading blocks -->
			<div class="space-y-6">
				{#each Array(4) as _, i (i)}
					<Skeleton variant="card" />
				{/each}
			</div>
		{:else if error}
			<div class="rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
				<p class="text-red-600 dark:text-red-400">{error}</p>
			</div>
		{:else if showEmpty}
			<!-- No blocks found -->
			<div class="text-center py-16">
				<svg class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
						d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<p class="text-gray-500 dark:text-gray-400 text-lg">Engin lykilatriði fundust í þessum kafla</p>
			</div>
		{:else}
			<!-- Review cards grouped by section -->
			<div class="space-y-8">
				{#each sectionGroups as group (group.section.file)}
					<!-- Section breadcrumb -->
					<div>
						<a
							href={sectionUrl(group.chapter, group.section)}
							class="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-3"
						>
							<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
							</svg>
							{sectionBreadcrumb(group.chapter, group.section)}
						</a>

						<!-- Block cards for this section -->
						<div class="space-y-4">
							{#each group.blocks as block, i (i)}
								<div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
									<!-- Type badge -->
									<div class="px-4 pt-3 pb-1">
										<span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium {TYPE_COLORS[block.type] ?? ''}">
											{TYPE_LABELS[block.type] ?? block.type}
										</span>
									</div>
									<!-- Block content -->
									<div class="px-4 pb-4 review-block-content reading-content">
										{@html block.html}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	/* Prevent double-framing when content blocks are rendered inside review cards */
	.review-block-content :global(.content-block) {
		border: none;
		box-shadow: none;
		padding: 0;
		margin: 0;
		background: transparent;
	}
	.review-block-content :global(.content-block-title) {
		display: none;
	}
	.review-block-content :global(.learning-objectives) {
		border: none;
		padding: 0;
		margin: 0;
		background: transparent;
	}
	.review-block-content :global(.learning-objectives h2) {
		display: none;
	}
</style>
