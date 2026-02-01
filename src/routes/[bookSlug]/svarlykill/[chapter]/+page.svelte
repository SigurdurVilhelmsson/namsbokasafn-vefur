<!--
  Answer Key Page - Shows answers for a chapter's exercises
  OpenStax style: separate page with answers linking back to exercises
-->
<script lang="ts">
	import type { PageData } from './$types';
	import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';

	export let data: PageData;

	// Get chapter slug for exercise linking (zero-padded)
	$: chapterSlug = data.chapterNumber.toString().padStart(2, '0');
</script>

<svelte:head>
	<title>Svarlykill - {data.chapterTitle} | Námsbókasafn</title>
</svelte:head>

<article class="max-w-3xl mx-auto px-1 sm:px-0">
	<!-- Header -->
	<header class="mb-8">
		<nav class="text-sm text-gray-500 dark:text-gray-400 mb-2">
			<a href="/{data.bookSlug}" class="hover:text-gray-700 dark:hover:text-gray-200">
				Efnafræði 2e
			</a>
			<span class="mx-2">/</span>
			<a href="/{data.bookSlug}/kafli/{chapterSlug}" class="hover:text-gray-700 dark:hover:text-gray-200">
				Kafli {data.chapterNumber}
			</a>
			<span class="mx-2">/</span>
			<span>Svarlykill</span>
		</nav>

		<h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
			Svarlykill: Kafli {data.chapterNumber}
		</h1>
		<p class="text-gray-600 dark:text-gray-400 mt-2">
			{data.chapterTitle}
		</p>

		<!-- Link back to exercises -->
		<div class="mt-4">
			<a
				href="/{data.bookSlug}/kafli/{chapterSlug}/{data.chapterNumber}-exercises"
				class="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
				</svg>
				Til baka í æfingar
			</a>
		</div>
	</header>

	<!-- Answer key content -->
	<div class="reading-content">
		<MarkdownRenderer
			content={data.section.content}
			bookSlug={data.bookSlug}
			chapterSlug={chapterSlug}
			sectionSlug="{data.chapterNumber}-answer-key"
			chapterNumber={data.chapterNumber}
			sectionType="answer-key"
			isHtml={data.section.isHtml || false}
		/>
	</div>

	<!-- Navigation between answer key pages -->
	{#if data.navigation.previous || data.navigation.next}
		<nav class="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
			{#if data.navigation.previous}
				<a
					href="/{data.bookSlug}/svarlykill/{data.navigation.previous.chapter}"
					class="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					<span class="hidden sm:inline">{data.navigation.previous.title}</span>
					<span class="sm:hidden">Kafli {data.navigation.previous.chapter}</span>
				</a>
			{:else}
				<div></div>
			{/if}

			{#if data.navigation.next}
				<a
					href="/{data.bookSlug}/svarlykill/{data.navigation.next.chapter}"
					class="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
				>
					<span class="hidden sm:inline">{data.navigation.next.title}</span>
					<span class="sm:hidden">Kafli {data.navigation.next.chapter}</span>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>
			{:else}
				<div></div>
			{/if}
		</nav>
	{/if}
</article>
