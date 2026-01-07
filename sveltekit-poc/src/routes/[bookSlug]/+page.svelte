<!--
  Book Home Page - Shows book overview and chapter list
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import type { TableOfContents } from '$lib/types/content';
	import { loadTableOfContents } from '$lib/utils/contentLoader';
	import { reader } from '$lib/stores';

	export let data: PageData;

	let toc: TableOfContents | null = null;
	let loading = true;
	let error: string | null = null;

	onMount(async () => {
		try {
			toc = await loadTableOfContents(data.bookSlug);
		} catch (e) {
			error = 'Gat ekki hlaðið efnisyfirliti';
			console.error(e);
		} finally {
			loading = false;
		}
	});

	function getChapterProgress(chapterSlug: string, totalSections: number): number {
		return reader.getChapterProgress(chapterSlug, totalSections);
	}
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
		<p class="text-gray-600 dark:text-gray-400">
			Veldu kafla til að byrja að lesa
		</p>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			<span class="ml-3 text-gray-600 dark:text-gray-400">Hleður...</span>
		</div>
	{:else if error}
		<div class="rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
			<p class="text-red-600 dark:text-red-400">{error}</p>
		</div>
	{:else if toc}
		<!-- Chapter grid -->
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each toc.chapters as chapter}
				{@const progress = getChapterProgress(chapter.slug, chapter.sections.length)}
				{@const firstSection = chapter.sections[0]}
				<a
					href="/{data.bookSlug}/kafli/{chapter.slug}/{firstSection?.slug ?? ''}"
					class="group block rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 transition-all hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700"
				>
					<div class="flex items-start justify-between mb-3">
						<span class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-bold">
							{chapter.number}
						</span>
						{#if progress > 0}
							<span class="text-xs font-medium text-emerald-600 dark:text-emerald-400">
								{progress}%
							</span>
						{/if}
					</div>

					<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
						{chapter.title}
					</h2>

					<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
						{chapter.sections.length} kaflar
					</p>

					{#if progress > 0}
						<div class="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
							<div
								class="h-full rounded-full bg-emerald-500 transition-all duration-300"
								style="width: {progress}%"
							></div>
						</div>
					{/if}
				</a>
			{/each}
		</div>

		<!-- Attribution -->
		{#if toc.source}
			<div class="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
				<h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
					Um bókina
				</h3>
				<div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
					<p><strong>Upprunalegt efni:</strong> {toc.source.original}</p>
					{#if toc.source.authors}
						<p><strong>Höfundar:</strong> {toc.source.authors}</p>
					{/if}
					{#if toc.source.translator}
						<p><strong>Þýðandi:</strong> {toc.source.translator}</p>
					{/if}
					{#if toc.source.license}
						<p>
							<strong>Leyfi:</strong>
							{#if toc.source.licenseUrl}
								<a href={toc.source.licenseUrl} target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">
									{toc.source.license}
								</a>
							{:else}
								{toc.source.license}
							{/if}
						</p>
					{/if}
				</div>
			</div>
		{/if}
	{/if}
</div>
