<!--
  Chapter View - Shows chapter overview with sections list
-->
<script lang="ts">
	import type { PageData } from './$types';
	import type { Section } from '$lib/types/content';
	import { reader } from '$lib/stores';
	import { isSectionRead, calcChapterProgress } from '$lib/stores/reader';
	import { getChapterPath, getSectionPath } from '$lib/utils/contentLoader';

	export let data: PageData;

	// Get chapter path for number-based routing
	$: chapterPath = getChapterPath(data.chapter);

	// Subscribe to reader progress for reactivity
	$: progress = $reader.progress;
	$: chapterProgress = calcChapterProgress(progress, chapterPath, data.chapter.sections.length);

	// Reactive: find first unread section or fall back to first section
	$: firstUnread = data.chapter.sections.find(s => !isSectionRead(progress, chapterPath, getSectionPath(s)));
	$: targetSection = firstUnread ?? data.chapter.sections[0];

	// Check if section is read using reactive progress
	function isRead(section: Section): boolean {
		return isSectionRead(progress, chapterPath, getSectionPath(section));
	}

	// Get section type from section (with type assertion)
	function getSectionType(section: Section): string | undefined {
		return (section as Section & { type?: string }).type;
	}

	// Get section type icon
	function getSectionIcon(type?: string): string {
		switch (type) {
			case 'glossary':
				return 'Aa';
			case 'equations':
				return 'fx';
			case 'summary':
				return 'S';
			case 'exercises':
				return 'D';
			case 'answer-key':
				return 'SV';
			default:
				return '';
		}
	}
</script>

<svelte:head>
	<title>Kafli {data.chapter.number}: {data.chapter.title} | {data.bookTitle}</title>
</svelte:head>

<div class="chapter-view min-h-[80vh] p-6">
	<div class="mx-auto max-w-3xl">
		<!-- Chapter header -->
		<div class="mb-8">
			<div class="flex items-center gap-4 mb-4">
				<span class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-2xl font-bold">
					{data.chapter.number}
				</span>
				<div>
					<p class="text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
						Kafli {data.chapter.number}
					</p>
					<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">
						{data.chapter.title}
					</h1>
				</div>
			</div>

			<!-- Progress indicator -->
			{#if chapterProgress > 0}
				<div class="flex items-center gap-3 mt-4">
					<div class="flex-1 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
						<div
							class="h-full rounded-full bg-emerald-500 transition-all duration-300"
							style="width: {chapterProgress}%"
						></div>
					</div>
					<span class="text-sm font-medium text-emerald-600 dark:text-emerald-400">
						{chapterProgress}% lesið
					</span>
				</div>
			{/if}
		</div>

		<!-- Section list -->
		<div class="mb-8">
			<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
				Efnisyfirlit
			</h2>

			<div class="space-y-2">
				{#each data.chapter.sections as section}
					{@const sectionPath = getSectionPath(section)}
					{@const sectionRead = isRead(section)}
					{@const sectionType = getSectionType(section)}
					{@const typeIcon = getSectionIcon(sectionType)}
					<a
						href="/{data.bookSlug}/kafli/{chapterPath}/{sectionPath}"
						class="group flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-4 transition-all hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/20"
					>
						<!-- Read indicator -->
						<div class="flex-shrink-0 w-6 h-6 flex items-center justify-center">
							{#if sectionRead}
								<svg
									class="w-5 h-5 text-emerald-500 dark:text-emerald-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 13l4 4L19 7"
									/>
								</svg>
							{:else}
								<div class="w-3 h-3 rounded-full border-2 border-gray-300 dark:border-gray-600"></div>
							{/if}
						</div>

						<!-- Section info -->
						<div class="flex-1 min-w-0">
							<h3 class="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
								{section.number} {section.title}
							</h3>
						</div>

						<!-- Type badge -->
						{#if typeIcon}
							<span class="flex-shrink-0 text-xs font-medium px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
								{typeIcon}
							</span>
						{/if}

						<!-- Arrow -->
						<svg
							class="flex-shrink-0 w-5 h-5 text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 5l7 7-7 7"
							/>
						</svg>
					</a>
				{/each}
			</div>
		</div>

		<!-- Navigation -->
		<div class="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
			<a
				href="/{data.bookSlug}"
				class="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
				Til baka á forsíðu
			</a>

			<!-- Start reading button -->
			{#if targetSection}
				<a
					href="/{data.bookSlug}/kafli/{chapterPath}/{getSectionPath(targetSection)}"
					class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
				>
					{firstUnread ? 'Halda áfram' : 'Byrja að lesa'}
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>
			{/if}
		</div>
	</div>
</div>
