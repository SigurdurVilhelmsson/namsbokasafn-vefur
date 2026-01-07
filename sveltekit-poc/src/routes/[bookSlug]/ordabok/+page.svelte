<!--
  Glossary Page
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import type { Glossary, GlossaryTerm } from '$lib/types/content';

	export let data: PageData;

	let glossary: Glossary | null = null;
	let loading = true;
	let error: string | null = null;
	let searchQuery = '';
	let selectedLetter: string | null = null;

	onMount(async () => {
		try {
			const response = await fetch(`/content/${data.bookSlug}/glossary.json`);
			if (!response.ok) throw new Error('Failed to load glossary');
			glossary = await response.json();
		} catch (e) {
			error = 'Gat ekki hlaðið orðasafni';
			console.error(e);
		} finally {
			loading = false;
		}
	});

	$: filteredTerms = glossary?.terms.filter((term) => {
		const matchesSearch =
			!searchQuery ||
			term.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
			term.definition.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesLetter =
			!selectedLetter || term.term.toUpperCase().startsWith(selectedLetter);
		return matchesSearch && matchesLetter;
	}) ?? [];

	$: letters = glossary
		? [...new Set(glossary.terms.map((t) => t.term[0].toUpperCase()))].sort()
		: [];

	function clearFilters() {
		searchQuery = '';
		selectedLetter = null;
	}
</script>

<svelte:head>
	<title>Orðasafn | {data.book?.title ?? 'Bók'}</title>
</svelte:head>

<div class="max-w-4xl mx-auto">
	<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
		Orðasafn
	</h1>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			<span class="ml-3 text-gray-600 dark:text-gray-400">Hleður...</span>
		</div>
	{:else if error}
		<div class="rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
			<p class="text-red-600 dark:text-red-400">{error}</p>
		</div>
	{:else if glossary}
		<!-- Search and filters -->
		<div class="mb-6 space-y-4">
			<!-- Search input -->
			<div class="relative">
				<svg
					class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Leita í orðasafni..."
					class="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
			</div>

			<!-- Letter filter -->
			<div class="flex flex-wrap gap-1">
				{#each letters as letter}
					<button
						on:click={() => (selectedLetter = selectedLetter === letter ? null : letter)}
						class="w-8 h-8 rounded-lg text-sm font-medium transition-colors {selectedLetter === letter
							? 'bg-blue-600 text-white'
							: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}"
					>
						{letter}
					</button>
				{/each}
				{#if selectedLetter || searchQuery}
					<button
						on:click={clearFilters}
						class="px-3 h-8 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
					>
						Hreinsa síu
					</button>
				{/if}
			</div>
		</div>

		<!-- Results count -->
		<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
			{filteredTerms.length} {filteredTerms.length === 1 ? 'niðurstaða' : 'niðurstöður'}
		</p>

		<!-- Terms list -->
		{#if filteredTerms.length === 0}
			<div class="text-center py-12">
				<svg class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<p class="text-gray-500 dark:text-gray-400">Engin orð fundust</p>
			</div>
		{:else}
			<div class="space-y-4">
				{#each filteredTerms as term (term.term)}
					<div class="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
						<div class="flex items-start justify-between">
							<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
								{term.term}
							</h3>
							{#if term.english}
								<span class="text-sm text-gray-500 dark:text-gray-400 italic">
									{term.english}
								</span>
							{/if}
						</div>
						<p class="mt-2 text-gray-700 dark:text-gray-300">
							{term.definition}
						</p>
						{#if term.relatedTerms && term.relatedTerms.length > 0}
							<div class="mt-3 flex flex-wrap gap-2">
								<span class="text-xs text-gray-500 dark:text-gray-400">Tengd orð:</span>
								{#each term.relatedTerms as related}
									<button
										on:click={() => (searchQuery = related)}
										class="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400 hover:underline"
									>
										{related}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>
