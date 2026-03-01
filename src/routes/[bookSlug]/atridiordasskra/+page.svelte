<!--
  Atriðisorðaskrá (Index) Page
  Book-wide alphabetical index with IS/EN toggle
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import Skeleton from '$lib/components/Skeleton.svelte';

	export let data: PageData;

	interface IndexEntry {
		termIs: string;
		termEn: string | null;
		termFull: string;
		definition: string;
		chapter: number;
		section: string | null;
		sectionTitle: string | null;
		sectionSlug: string | null;
		termId: string;
	}

	interface IndexData {
		generated: string;
		termCount: number;
		entries: IndexEntry[];
	}

	let indexData: IndexData | null = null;
	let loading = true;
	let error: string | null = null;
	let searchQuery = '';
	let selectedLetter: string | null = null;
	let language: 'is' | 'en' = 'is';

	onMount(async () => {
		try {
			const response = await fetch(`/content/${data.bookSlug}/index.json`);
			if (!response.ok) throw new Error('Failed to load index');
			indexData = await response.json();
		} catch (e) {
			error = 'Gat ekki hlaðið atriðisorðaskrá';
			console.error(e);
		} finally {
			loading = false;
		}
	});

	// Collators for sorting
	const icelandicCollator = new Intl.Collator('is', { sensitivity: 'base' });
	const englishCollator = new Intl.Collator('en', { sensitivity: 'base' });

	// Group entries by the active term (IS or EN), merging chapter refs
	interface GroupedTerm {
		primaryTerm: string;
		secondaryTerm: string | null;
		definition: string;
		refs: Array<{
			chapter: number;
			section: string | null;
			sectionTitle: string | null;
			sectionSlug: string | null;
		}>;
	}

	$: collator = language === 'is' ? icelandicCollator : englishCollator;

	$: groupedTerms = (() => {
		if (!indexData) return [];

		const groups = new Map<string, GroupedTerm>();

		for (const entry of indexData.entries) {
			const primaryTerm = language === 'is' ? entry.termIs : (entry.termEn || entry.termIs);
			const secondaryTerm = language === 'is' ? entry.termEn : entry.termIs;
			const key = primaryTerm.toLowerCase();

			// Search filter
			if (searchQuery) {
				const q = searchQuery.toLowerCase();
				const matchesIs = entry.termIs.toLowerCase().includes(q);
				const matchesEn = entry.termEn?.toLowerCase().includes(q) || false;
				const matchesDef = entry.definition.toLowerCase().includes(q);
				if (!matchesIs && !matchesEn && !matchesDef) continue;
			}

			// Letter filter
			if (selectedLetter) {
				const firstChar = primaryTerm[0]?.toUpperCase();
				if (firstChar !== selectedLetter) continue;
			}

			if (!groups.has(key)) {
				groups.set(key, {
					primaryTerm,
					secondaryTerm,
					definition: entry.definition,
					refs: [],
				});
			}

			const group = groups.get(key)!;
			// Avoid duplicate chapter refs
			const alreadyHas = group.refs.some(
				r => r.chapter === entry.chapter && r.section === entry.section
			);
			if (!alreadyHas) {
				group.refs.push({
					chapter: entry.chapter,
					section: entry.section,
					sectionTitle: entry.sectionTitle,
					sectionSlug: entry.sectionSlug,
				});
			}
		}

		// Sort groups by primary term
		const sorted = Array.from(groups.values()).sort((a, b) =>
			collator.compare(a.primaryTerm.toLowerCase(), b.primaryTerm.toLowerCase())
		);

		// Sort refs within each group by chapter/section
		for (const group of sorted) {
			group.refs.sort((a, b) => {
				if (a.chapter !== b.chapter) return a.chapter - b.chapter;
				return (a.section || '').localeCompare(b.section || '', undefined, { numeric: true });
			});
		}

		return sorted;
	})();

	// Get letters present in the data (for the active language)
	$: letters = (() => {
		if (!indexData) return [];
		const letterSet = new Set<string>();

		for (const entry of indexData.entries) {
			const term = language === 'is' ? entry.termIs : (entry.termEn || entry.termIs);
			const first = term[0]?.toUpperCase();
			if (first) letterSet.add(first);
		}

		return [...letterSet].sort((a, b) => collator.compare(a, b));
	})();

	function clearFilters() {
		searchQuery = '';
		selectedLetter = null;
	}

	function setLanguage(lang: 'is' | 'en') {
		language = lang;
		selectedLetter = null; // Reset letter filter when switching language
	}

	// Group terms by their first letter for section headers
	$: termsByLetter = (() => {
		const map = new Map<string, GroupedTerm[]>();
		for (const term of groupedTerms) {
			const letter = term.primaryTerm[0]?.toUpperCase() || '?';
			if (!map.has(letter)) map.set(letter, []);
			map.get(letter)!.push(term);
		}
		return map;
	})();

	// Build section link
	function sectionHref(ref: GroupedTerm['refs'][0]): string {
		const chapterSlug = String(ref.chapter).padStart(2, '0');
		if (ref.sectionSlug) {
			return `/${data.bookSlug}/kafli/${chapterSlug}/${ref.sectionSlug}`;
		}
		return `/${data.bookSlug}/kafli/${chapterSlug}`;
	}
</script>

<svelte:head>
	<title>Atriðisorðaskrá | {data.book?.title ?? 'Bók'}</title>
	<meta property="og:title" content="Atriðisorðaskrá | {data.book?.title ?? 'Bók'}" />
	<meta property="og:description" content="Atriðisorðaskrá fyrir {data.book?.title ?? 'kennslubók'}" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://namsbokasafn.is/{data.bookSlug}/atridiordasskra" />
</svelte:head>

<div class="max-w-4xl mx-auto">
	<h1 class="index-heading">
		Atriðisorðaskrá
	</h1>

	{#if loading}
		<div class="space-y-4">
			{#each Array(8) as _}
				<Skeleton variant="list-item" />
			{/each}
		</div>
	{:else if error}
		<div class="index-error">
			<p>{error}</p>
		</div>
	{:else if indexData}
		<!-- Language toggle + search row -->
		<div class="mb-6 space-y-4">
			<!-- Language toggle -->
			<div class="index-toggle-row">
				<div class="index-toggle">
					<button
						on:click={() => setLanguage('is')}
						class="index-toggle-btn"
						class:index-toggle-btn--active={language === 'is'}
					>
						Íslenska
					</button>
					<button
						on:click={() => setLanguage('en')}
						class="index-toggle-btn"
						class:index-toggle-btn--active={language === 'en'}
					>
						English
					</button>
				</div>
			</div>

			<!-- Search input -->
			<div class="relative">
				<svg
					class="index-search-icon"
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
					placeholder="Leita í atriðisorðaskrá..."
					class="index-search-input"
				/>
			</div>

			<!-- Letter filter -->
			<div class="flex flex-wrap gap-1">
				{#each letters as letter}
					<button
						on:click={() => (selectedLetter = selectedLetter === letter ? null : letter)}
						class="index-letter-btn"
						class:index-letter-btn--active={selectedLetter === letter}
					>
						{letter}
					</button>
				{/each}
				{#if selectedLetter || searchQuery}
					<button
						on:click={clearFilters}
						class="index-clear-btn"
					>
						Hreinsa síu
					</button>
				{/if}
			</div>
		</div>

		<!-- Results count -->
		<p class="index-count">
			{groupedTerms.length} {groupedTerms.length === 1 ? 'hugtak' : 'hugtök'}
		</p>

		<!-- Terms list grouped by letter -->
		{#if groupedTerms.length === 0}
			<div class="text-center py-12">
				<svg class="index-empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<p class="index-empty-text">Engin hugtök fundust</p>
			</div>
		{:else}
			<div class="index-list">
				{#each [...termsByLetter.entries()] as [letter, terms] (letter)}
					<div class="index-letter-section">
						<h2 class="index-letter-heading">{letter}</h2>
						<div class="index-letter-terms">
							{#each terms as term (term.primaryTerm)}
								<div class="index-term-row">
									<div class="index-term-content">
										<span class="index-term-primary">{term.primaryTerm}</span>
										{#if term.secondaryTerm}
											<span class="index-term-secondary">({term.secondaryTerm})</span>
										{/if}
										<span class="index-term-refs">
											{#each term.refs as ref, i}
												{#if i > 0}<span class="index-ref-sep">,</span>{/if}
												<a
													href={sectionHref(ref)}
													class="index-ref-link"
													title={ref.sectionTitle || `Kafli ${ref.chapter}`}
												>
													{ref.section || `${ref.chapter}`}
												</a>
											{/each}
										</span>
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
	/* Heading */
	.index-heading {
		font-family: "Bricolage Grotesque", system-ui, sans-serif;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 1.5rem;
	}

	/* Error */
	.index-error {
		border-radius: var(--radius-lg);
		background-color: #fef2f2;
		padding: 1rem;
		color: #dc2626;
	}
	:global(.dark) .index-error {
		background-color: rgba(127,29,29,0.2);
		color: #f87171;
	}

	/* Language toggle */
	.index-toggle-row {
		display: flex;
		align-items: center;
	}
	.index-toggle {
		display: inline-flex;
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-color);
		overflow: hidden;
	}
	.index-toggle-btn {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		background-color: var(--bg-secondary);
		color: var(--text-secondary);
		border: none;
		transition: all 0.15s;
		cursor: pointer;
	}
	.index-toggle-btn:not(:last-child) {
		border-right: 1px solid var(--border-color);
	}
	.index-toggle-btn:hover:not(.index-toggle-btn--active) {
		background-color: var(--bg-tertiary);
	}
	.index-toggle-btn--active {
		background-color: var(--accent-color);
		color: white;
	}

	/* Search */
	.index-search-icon {
		position: absolute;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		width: 1.25rem;
		height: 1.25rem;
		color: var(--text-tertiary);
	}
	.index-search-input {
		width: 100%;
		padding: 0.75rem 1rem 0.75rem 2.5rem;
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-color);
		background-color: var(--bg-secondary);
		color: var(--text-primary);
		font-size: 1rem;
	}
	.index-search-input::placeholder {
		color: var(--text-tertiary);
	}
	.index-search-input:focus {
		outline: none;
		border-color: var(--accent-color);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color) 20%, transparent);
	}

	/* Letter filter */
	.index-letter-btn {
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
	.index-letter-btn:hover {
		background-color: var(--bg-tertiary);
	}
	.index-letter-btn--active {
		background-color: var(--accent-color);
		color: white;
		border-color: var(--accent-color);
	}
	.index-letter-btn--active:hover {
		background-color: var(--accent-color);
		opacity: 0.9;
	}
	.index-clear-btn {
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
	.index-clear-btn:hover {
		background-color: var(--bg-tertiary);
	}

	/* Results count */
	.index-count {
		font-size: 0.875rem;
		color: var(--text-tertiary);
		margin-bottom: 1rem;
	}

	/* Empty state */
	.index-empty-icon {
		width: 4rem;
		height: 4rem;
		margin: 0 auto;
		color: var(--border-color);
		margin-bottom: 1rem;
	}
	.index-empty-text {
		color: var(--text-tertiary);
	}

	/* Letter sections */
	.index-list {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	.index-letter-section {
		/* No extra styling needed */
	}
	.index-letter-heading {
		font-family: "Bricolage Grotesque", system-ui, sans-serif;
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--accent-color);
		padding-bottom: 0.375rem;
		border-bottom: 2px solid var(--accent-color);
		margin-bottom: 0.5rem;
	}
	.index-letter-terms {
		display: flex;
		flex-direction: column;
	}

	/* Term rows */
	.index-term-row {
		padding: 0.375rem 0;
		border-bottom: 1px solid color-mix(in srgb, var(--border-color) 40%, transparent);
	}
	.index-term-row:last-child {
		border-bottom: none;
	}
	.index-term-content {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.375rem;
		line-height: 1.5;
	}
	.index-term-primary {
		font-weight: 600;
		color: var(--text-primary);
	}
	.index-term-secondary {
		font-size: 0.875rem;
		color: var(--text-tertiary);
		font-style: italic;
	}
	.index-term-refs {
		margin-left: auto;
		font-size: 0.875rem;
		white-space: nowrap;
	}
	.index-ref-sep {
		color: var(--text-tertiary);
		margin: 0 0.125rem;
	}
	.index-ref-link {
		color: var(--accent-color);
		text-decoration: none;
		font-weight: 500;
		transition: opacity 0.15s;
	}
	.index-ref-link:hover {
		text-decoration: underline;
		opacity: 0.8;
	}

	/* Responsive: stack term and refs on small screens */
	@media (max-width: 640px) {
		.index-term-content {
			flex-direction: column;
			gap: 0.125rem;
		}
		.index-term-refs {
			margin-left: 0;
		}
	}
</style>
