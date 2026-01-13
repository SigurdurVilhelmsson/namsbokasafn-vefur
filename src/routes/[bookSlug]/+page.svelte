<!--
  Book Home Page - Shows book overview and chapter list
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import type { TableOfContents, Chapter } from '$lib/types/content';
	import { loadTableOfContents, getChapterPath, getSectionPath } from '$lib/utils/contentLoader';
	import { reader } from '$lib/stores';
	import { calcChapterProgress } from '$lib/stores/reader';
	import DownloadBookButton from '$lib/components/DownloadBookButton.svelte';
	import ErrorMessage from '$lib/components/ErrorMessage.svelte';

	export let data: PageData;

	let toc: TableOfContents | null = null;
	let loading = true;
	let error: string | null = null;

	// Subscribe to reader progress for reactivity
	$: progress = $reader.progress;

	async function loadContent() {
		loading = true;
		error = null;
		try {
			toc = await loadTableOfContents(data.bookSlug);
		} catch (e) {
			error = 'Gat ekki hlaðið efnisyfirliti. Athugaðu nettengingu eða reyndu aftur síðar.';
			console.error('Failed to load table of contents:', e);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadContent();
	});

	// Reactive helper using subscribed progress
	function getChapterProgressPercent(chapter: Chapter): number {
		return calcChapterProgress(progress, getChapterPath(chapter), chapter.sections.length);
	}

	// Get attribution data (supports both 'source' and 'attribution' fields with v1/v2 field names)
	$: attribution = toc?.source || toc?.attribution;
	// Handle both v1 field names (original, authors) and v2 field names (originalTitle, originalAuthors)
	$: originalTitle = attribution?.original || (attribution as any)?.originalTitle;
	$: authors = attribution?.authors || (attribution as any)?.originalAuthors;
</script>

<svelte:head>
	<title>{data.book?.title ?? 'Bók'} | Námsbókasafn</title>
</svelte:head>

<div class="book-home">
	<!-- Welcome section -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
			{data.book?.title ?? 'Bók'}
		</h1>
		<p class="text-gray-600 dark:text-gray-300 mb-4">
			Veldu kafla til að byrja að lesa
		</p>
		<DownloadBookButton bookSlug={data.bookSlug} bookTitle={data.book?.title ?? ''} />
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			<span class="ml-3 text-gray-600 dark:text-gray-300">Hleður...</span>
		</div>
	{:else if error}
		<ErrorMessage
			message={error}
			onRetry={loadContent}
			showBackLink={true}
			backHref="/"
			backLabel="Til baka í bókasafn"
		/>
	{:else if toc}
		<!-- Chapter grid -->
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each toc.chapters as chapter}
				{@const chapterPath = getChapterPath(chapter)}
				{@const progressPercent = getChapterProgressPercent(chapter)}
				{@const firstSection = chapter.sections[0]}
				{@const firstSectionPath = firstSection ? getSectionPath(firstSection) : ''}
				<a
					href="/{data.bookSlug}/kafli/{chapterPath}/{firstSectionPath}"
					class="group block rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 transition-all hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700"
				>
					<div class="flex items-start justify-between mb-3">
						<span class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-bold">
							{chapter.number}
						</span>
						{#if progressPercent > 0}
							<span class="text-xs font-medium text-emerald-600 dark:text-emerald-400">
								{progressPercent}%
							</span>
						{/if}
					</div>

					<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
						{chapter.title}
					</h2>

					<p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
						{chapter.sections.length} kaflar
					</p>

					{#if progressPercent > 0}
						<div class="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
							<div
								class="h-full rounded-full bg-emerald-500 transition-all duration-300"
								style="width: {progressPercent}%"
							></div>
						</div>
					{/if}
				</a>
			{/each}
		</div>

		<!-- Attribution -->
		{#if attribution}
			<div class="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
				<h3 class="text-sm font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider mb-4">
					Um bókina
				</h3>
				<div class="text-sm text-gray-600 dark:text-gray-300 space-y-1">
					{#if originalTitle}
						<p><strong>Upprunalegt efni:</strong> {originalTitle}</p>
					{/if}
					{#if authors}
						<p><strong>Höfundar:</strong> {authors}</p>
					{/if}
					{#if attribution.translator}
						<p><strong>Þýðandi:</strong> {attribution.translator}</p>
					{/if}
					{#if attribution.license}
						<p>
							<strong>Leyfi:</strong>
							{#if attribution.licenseUrl}
								<a href={attribution.licenseUrl} target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">
									{attribution.license}
								</a>
							{:else}
								{attribution.license}
							{/if}
						</p>
					{/if}
				</div>
			</div>
		{/if}
	{/if}
</div>
