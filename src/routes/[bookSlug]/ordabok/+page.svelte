<!--
  Glossary Page
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import type { Glossary, GlossaryTerm } from '$lib/types/content';
	import Skeleton from '$lib/components/Skeleton.svelte';

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

	// Icelandic collation for proper alphabetization
	const icelandicCollator = new Intl.Collator('is', { sensitivity: 'base' });

	$: filteredTerms = (glossary?.terms.filter((term) => {
		const matchesSearch =
			!searchQuery ||
			term.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
			term.definition.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesLetter =
			!selectedLetter || term.term.toUpperCase().startsWith(selectedLetter);
		return matchesSearch && matchesLetter;
	}) ?? []).sort((a, b) => icelandicCollator.compare(a.term, b.term));

	$: letters = glossary
		? [...new Set(glossary.terms.map((t) => t.term[0].toUpperCase()))].sort((a, b) => icelandicCollator.compare(a, b))
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
	<h1 class="glossary-heading">
		Orðasafn
	</h1>

	{#if loading}
		<div class="space-y-4">
			{#each Array(8) as _}
				<Skeleton variant="list-item" />
			{/each}
		</div>
	{:else if error}
		<div class="glossary-error">
			<p>{error}</p>
		</div>
	{:else if glossary}
		<!-- Search and filters -->
		<div class="mb-6 space-y-4">
			<!-- Search input -->
			<div class="relative">
				<svg
					class="glossary-search-icon"
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
					class="glossary-search-input"
				/>
			</div>

			<!-- Letter filter -->
			<div class="flex flex-wrap gap-1">
				{#each letters as letter}
					<button
						on:click={() => (selectedLetter = selectedLetter === letter ? null : letter)}
						class="glossary-letter-btn"
						class:glossary-letter-btn--active={selectedLetter === letter}
					>
						{letter}
					</button>
				{/each}
				{#if selectedLetter || searchQuery}
					<button
						on:click={clearFilters}
						class="glossary-clear-btn"
					>
						Hreinsa síu
					</button>
				{/if}
			</div>
		</div>

		<!-- Results count -->
		<p class="glossary-count">
			{filteredTerms.length} {filteredTerms.length === 1 ? 'niðurstaða' : 'niðurstöður'}
		</p>

		<!-- Terms list -->
		{#if filteredTerms.length === 0}
			<div class="text-center py-12">
				<svg class="glossary-empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<p class="glossary-empty-text">Engin orð fundust</p>
			</div>
		{:else}
			<div class="glossary-list">
				{#each filteredTerms as term (term.term)}
					<div class="glossary-term-card">
						<div class="flex items-start justify-between">
							<h3 class="glossary-term-title">
								{term.term}
							</h3>
							{#if term.english}
								<span class="glossary-term-english">
									{term.english}
								</span>
							{/if}
						</div>
						<p class="glossary-term-definition">
							{term.definition}
						</p>
						{#if term.relatedTerms && term.relatedTerms.length > 0}
							<div class="glossary-related">
								<span class="glossary-related-label">Tengd orð:</span>
								{#each term.relatedTerms as related}
									<button
										on:click={() => (searchQuery = related)}
										class="glossary-related-tag"
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

<style>
	/* Heading */
	.glossary-heading {
		font-family: "Bricolage Grotesque", system-ui, sans-serif;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 1.5rem;
	}

	/* Error */
	.glossary-error {
		border-radius: var(--radius-lg);
		background-color: #fef2f2;
		padding: 1rem;
		color: #dc2626;
	}
	:global(.dark) .glossary-error {
		background-color: rgba(127,29,29,0.2);
		color: #f87171;
	}

	/* Search */
	.glossary-search-icon {
		position: absolute;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		width: 1.25rem;
		height: 1.25rem;
		color: var(--text-tertiary);
	}
	.glossary-search-input {
		width: 100%;
		padding: 0.75rem 1rem 0.75rem 2.5rem;
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-color);
		background-color: var(--bg-secondary);
		color: var(--text-primary);
		font-size: 1rem;
	}
	.glossary-search-input::placeholder {
		color: var(--text-tertiary);
	}
	.glossary-search-input:focus {
		outline: none;
		border-color: var(--accent-color);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color) 20%, transparent);
	}

	/* Letter filter */
	.glossary-letter-btn {
		width: 2rem;
		height: 2rem;
		border-radius: var(--radius-lg);
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.15s;
		background-color: var(--bg-secondary);
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
	}
	.glossary-letter-btn:hover {
		background-color: var(--bg-tertiary);
	}
	.glossary-letter-btn--active {
		background-color: var(--accent-color);
		color: white;
		border-color: var(--accent-color);
	}
	.glossary-letter-btn--active:hover {
		background-color: var(--accent-color);
		opacity: 0.9;
	}
	.glossary-clear-btn {
		padding: 0 0.75rem;
		height: 2rem;
		border-radius: var(--radius-lg);
		font-size: 0.875rem;
		font-weight: 500;
		background-color: var(--bg-secondary);
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
		transition: background-color 0.15s;
	}
	.glossary-clear-btn:hover {
		background-color: var(--bg-tertiary);
	}

	/* Results count */
	.glossary-count {
		font-size: 0.875rem;
		color: var(--text-tertiary);
		margin-bottom: 1rem;
	}

	/* Empty state */
	.glossary-empty-icon {
		width: 4rem;
		height: 4rem;
		margin: 0 auto;
		color: var(--border-color);
		margin-bottom: 1rem;
	}
	.glossary-empty-text {
		color: var(--text-tertiary);
	}

	/* Terms list */
	.glossary-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.glossary-term-card {
		padding: 1rem;
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-color);
		background-color: var(--bg-secondary);
	}
	.glossary-term-title {
		font-family: "Bricolage Grotesque", system-ui, sans-serif;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-primary);
	}
	.glossary-term-english {
		font-size: 0.875rem;
		color: var(--text-tertiary);
		font-style: italic;
	}
	.glossary-term-definition {
		margin-top: 0.5rem;
		color: var(--text-secondary);
	}

	/* Related terms */
	.glossary-related {
		margin-top: 0.75rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}
	.glossary-related-label {
		font-size: 0.75rem;
		color: var(--text-tertiary);
	}
	.glossary-related-tag {
		font-size: 0.75rem;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		background-color: var(--bg-tertiary);
		color: var(--accent-color);
		transition: opacity 0.15s;
	}
	.glossary-related-tag:hover {
		opacity: 0.8;
		text-decoration: underline;
	}
</style>
