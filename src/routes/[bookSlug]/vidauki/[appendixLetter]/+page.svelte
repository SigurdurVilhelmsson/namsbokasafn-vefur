<!--
  Appendix View Page - Renders a book appendix with markdown content
-->
<script lang="ts">
	import type { PageData } from './$types';
	import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';
	import { getAppendixPath } from '$lib/utils/contentLoader';

	export let data: PageData;
</script>

<svelte:head>
	<title>Viðauki {data.appendix.letter}: {data.appendix.title} | Námsbókasafn</title>
</svelte:head>

<article class="max-w-3xl mx-auto px-1 sm:px-0">
	<!-- Breadcrumb navigation -->
	<nav class="mb-6 text-sm text-gray-500 dark:text-gray-400" aria-label="Brauðmylsna">
		<ol class="flex items-center gap-2">
			<li>
				<a href="/{data.bookSlug}" class="hover:text-blue-600 dark:hover:text-blue-400">
					Efnisyfirlit
				</a>
			</li>
			<li class="flex items-center gap-2">
				<span>/</span>
				<span class="text-gray-900 dark:text-gray-100">
					Viðauki {data.appendix.letter}
				</span>
			</li>
		</ol>
	</nav>

	<!-- Page header -->
	<header class="mb-8">
		<div class="flex items-center gap-3 mb-2">
			<span class="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold text-lg">
				{data.appendix.letter}
			</span>
			<span class="text-sm font-medium text-purple-600 dark:text-purple-400">Viðauki</span>
		</div>
		<h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
			{data.appendix.title}
		</h1>
		{#if data.content.readingTime}
			<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
				~{data.content.readingTime} mín lestími
			</p>
		{/if}
	</header>

	<!-- Main content -->
	<div class="prose dark:prose-invert max-w-none">
		<MarkdownRenderer
			content={data.content.content}
			bookSlug={data.bookSlug}
			chapterSlug="appendix"
			sectionSlug={data.appendixLetter}
			chapterNumber={0}
		/>
	</div>
</article>

<!-- Navigation between appendices -->
<nav class="max-w-3xl mx-auto mt-12 px-1 sm:px-0" aria-label="Flakka milli viðauka">
	<div class="flex flex-col sm:flex-row items-stretch gap-4 border-t border-gray-200 dark:border-gray-700 pt-6">
		{#if data.previousAppendix}
			<a
				href="/{data.bookSlug}/vidauki/{getAppendixPath(data.previousAppendix)}"
				class="flex-1 group p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
			>
				<div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					<span>Fyrri viðauki</span>
				</div>
				<div class="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
					Viðauki {data.previousAppendix.letter}: {data.previousAppendix.title}
				</div>
			</a>
		{:else}
			<div class="flex-1"></div>
		{/if}

		{#if data.nextAppendix}
			<a
				href="/{data.bookSlug}/vidauki/{getAppendixPath(data.nextAppendix)}"
				class="flex-1 group p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-right"
			>
				<div class="flex items-center justify-end gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
					<span>Næsti viðauki</span>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</div>
				<div class="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
					Viðauki {data.nextAppendix.letter}: {data.nextAppendix.title}
				</div>
			</a>
		{:else}
			<div class="flex-1"></div>
		{/if}
	</div>
</nav>

<!-- Appendix list -->
<aside class="max-w-3xl mx-auto mt-8 mb-12 px-1 sm:px-0">
	<details class="group">
		<summary class="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
			<span class="font-medium text-gray-700 dark:text-gray-300">
				Allir viðaukar ({data.allAppendices.length})
			</span>
			<svg class="w-5 h-5 text-gray-500 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</summary>
		<ul class="mt-2 divide-y divide-gray-200 dark:divide-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
			{#each data.allAppendices as appendixItem}
				<li>
					<a
						href="/{data.bookSlug}/vidauki/{getAppendixPath(appendixItem)}"
						class="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors {appendixItem.letter === data.appendix.letter ? 'bg-blue-50 dark:bg-blue-900/20' : ''}"
						aria-current={appendixItem.letter === data.appendix.letter ? 'page' : undefined}
					>
						<span class="flex-shrink-0 w-8 h-8 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold text-sm flex items-center justify-center">
							{appendixItem.letter}
						</span>
						<span class="text-gray-900 dark:text-gray-100 {appendixItem.letter === data.appendix.letter ? 'font-medium' : ''}">
							{appendixItem.title}
						</span>
						{#if appendixItem.isInteractive}
							<span class="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
								Gagnvirkt
							</span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	</details>
</aside>
