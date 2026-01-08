<!--
  Section View Page - Renders a book section with markdown content
-->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { PageData } from './$types';
	import { reader, analyticsStore } from '$lib/stores';
	import { isSectionRead, isSectionBookmarked } from '$lib/stores/reader';
	import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';
	import NavigationButtons from '$lib/components/NavigationButtons.svelte';

	export let data: PageData;

	// Subscribe to reader state for reactivity
	$: progress = $reader.progress;
	$: bookmarks = $reader.bookmarks;

	// Mark section as read and start analytics session
	onMount(() => {
		reader.setCurrentLocation(data.chapterSlug, data.sectionSlug);
		analyticsStore.startReadingSession(data.bookSlug, data.chapterSlug, data.sectionSlug);
	});

	// End analytics session when leaving
	onDestroy(() => {
		analyticsStore.endReadingSession();
	});

	function markAsRead() {
		reader.markAsRead(data.chapterSlug, data.sectionSlug);
	}

	// Reactive checks using subscribed state
	$: isRead = isSectionRead(progress, data.chapterSlug, data.sectionSlug);
	$: isBookmarked = isSectionBookmarked(bookmarks, data.chapterSlug, data.sectionSlug);

	function toggleBookmark() {
		reader.toggleBookmark(data.chapterSlug, data.sectionSlug);
	}
</script>

<svelte:head>
	<title>{data.section.section} {data.section.title} | Námsbókasafn</title>
</svelte:head>

<article class="max-w-3xl mx-auto">
	<!-- Reading progress bar -->
	<div class="mb-6 flex items-center justify-between">
		<div class="flex items-center gap-3">
			{#if data.section.readingTime}
				<span class="text-sm text-gray-500 dark:text-gray-400">
					~{data.section.readingTime} mín lestur
				</span>
			{/if}
			{#if data.section.difficulty}
				<span
					class="text-xs px-2 py-1 rounded-full {data.section.difficulty === 'beginner'
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
		<div class="flex items-center gap-2">
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
					class="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
					Merkja sem lesið
				</button>
			{:else}
				<span class="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
					Lesið
				</span>
			{/if}
		</div>
	</div>

	<!-- Learning Objectives -->
	{#if data.section.objectives && data.section.objectives.length > 0}
		<div class="mb-8 p-6 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
			<h3 class="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
				</svg>
				Námsmarkmið
			</h3>
			<p class="text-sm text-blue-800 dark:text-blue-200 mb-3">
				Eftir að hafa lesið þennan kafla ættirðu að geta:
			</p>
			<ul class="space-y-2">
				{#each data.section.objectives as objective, i}
					<li class="flex items-start gap-2 text-blue-800 dark:text-blue-200">
						<span class="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-xs font-medium">
							{i + 1}
						</span>
						<span>{objective}</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- Main content -->
	<MarkdownRenderer content={data.section.content} />

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
