<!--
  SearchModal - Global search modal with fuzzy search (⌘K / Ctrl+K)
-->
<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { fade, scale } from 'svelte/transition';
	import { loadTableOfContents } from '$lib/utils/contentLoader';
	import {
		searchContent,
		buildSearchIndex,
		getSearchChapters,
		highlightQuery,
		getSearchHistory,
		addToSearchHistory,
		clearSearchHistory,
		removeFromSearchHistory,
		type SearchResult,
		type SearchFilters,
		type SearchHistoryItem
	} from '$lib/utils/searchIndex';
	import type { TableOfContents } from '$lib/types/content';

	export let isOpen = false;
	export let bookSlug: string = '';

	const dispatch = createEventDispatcher<{ close: void }>();

	let query = '';
	let results: SearchResult[] = [];
	let loading = false;
	let indexing = false;
	let toc: TableOfContents | null = null;
	let chapters: { slug: string; title: string }[] = [];
	let selectedChapter = '';
	let showFilters = false;
	let searchHistory: SearchHistoryItem[] = [];
	let inputRef: HTMLInputElement;
	let modalRef: HTMLDivElement;
	let searchTimeout: ReturnType<typeof setTimeout>;

	// Initialize search on mount
	onMount(() => {
		if (bookSlug) {
			initSearch();
		}
		searchHistory = getSearchHistory();
	});

	// Re-init when bookSlug changes
	$: if (bookSlug && isOpen) {
		initSearch();
	}

	// Focus input when modal opens
	$: if (isOpen && inputRef) {
		setTimeout(() => inputRef?.focus(), 50);
	}

	// Keyboard shortcut handler
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			close();
		}
	}

	async function initSearch() {
		if (!bookSlug) return;

		indexing = true;
		try {
			toc = await loadTableOfContents(bookSlug);
			await buildSearchIndex(toc, bookSlug);
			chapters = getSearchChapters();
		} catch (error) {
			console.error('Villa við að byggja leitarvísitölu:', error);
		}
		indexing = false;
	}

	function refreshHistory() {
		searchHistory = getSearchHistory();
	}

	// Debounced search
	$: {
		if (query && toc && bookSlug) {
			clearTimeout(searchTimeout);
			searchTimeout = setTimeout(() => performSearch(), 200);
		} else {
			results = [];
		}
	}

	async function performSearch() {
		if (!toc || query.length < 2 || !bookSlug) {
			results = [];
			return;
		}

		loading = true;

		const filters: SearchFilters = {};
		if (selectedChapter) {
			filters.chapterSlug = selectedChapter;
		}

		const searchResults = await searchContent(query, toc, bookSlug, filters);
		results = searchResults;
		loading = false;

		// Add to search history after successful search
		if (searchResults.length > 0) {
			addToSearchHistory(query, searchResults.length);
			refreshHistory();
		}
	}

	function handleResultClick(result: SearchResult) {
		goto(`/${bookSlug}/kafli/${result.chapterSlug}/${result.sectionSlug}`);
		close();
	}

	function close() {
		query = '';
		results = [];
		dispatch('close');
	}

	function clearFilters() {
		selectedChapter = '';
	}

	function handleHistoryClick(historyQuery: string) {
		query = historyQuery;
	}

	function handleRemoveHistoryItem(historyQuery: string) {
		removeFromSearchHistory(historyQuery);
		refreshHistory();
	}

	function handleClearHistory() {
		clearSearchHistory();
		searchHistory = [];
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			close();
		}
	}

	// Focus trap
	function handleModalKeydown(e: KeyboardEvent) {
		if (e.key !== 'Tab' || !modalRef) return;

		const focusable = modalRef.querySelectorAll<HTMLElement>(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		);
		const first = focusable[0];
		const last = focusable[focusable.length - 1];

		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last?.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first?.focus();
		}
	}

	$: hasActiveFilters = selectedChapter !== '';

	onDestroy(() => {
		clearTimeout(searchTimeout);
	});
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-[10vh] backdrop-blur-sm"
		on:click={handleBackdropClick}
		on:keydown={handleModalKeydown}
		role="presentation"
		transition:fade={{ duration: 150 }}
	>
		<!-- Modal -->
		<div
			bind:this={modalRef}
			class="relative w-full max-w-lg rounded-2xl bg-[var(--bg-primary)] shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="search-modal-title"
			transition:scale={{ duration: 200, start: 0.95 }}
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-[var(--border-color)] px-6 py-4">
				<h2 id="search-modal-title" class="font-sans text-xl font-semibold text-[var(--text-primary)]">
					Leita í bókinni
				</h2>
				<button
					on:click={close}
					class="-mr-2 rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
					aria-label="Loka"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Content -->
			<div class="max-h-[70vh] overflow-y-auto px-6 py-6">
				<div class="space-y-4">
					<!-- Search input -->
					<div class="relative">
						<label for="search-input" class="sr-only">Leita að efni</label>
						<svg
							class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-secondary)]"
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
							id="search-input"
							bind:this={inputRef}
							type="text"
							bind:value={query}
							placeholder="Leitaðu að efni... (styður óbeint samsvörun)"
							class="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] py-3 pl-10 pr-20 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-[var(--accent-color)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/20"
						/>
						<div class="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
							{#if loading}
								<svg class="h-5 w-5 animate-spin text-[var(--accent-color)]" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
								</svg>
							{/if}
							<button
								on:click={() => (showFilters = !showFilters)}
								class="rounded p-1 transition-colors {showFilters || hasActiveFilters
									? 'bg-[var(--accent-color)]/10 text-[var(--accent-color)]'
									: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}"
								aria-label="Síur"
								title="Síur"
							>
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
								</svg>
							</button>
						</div>
					</div>

					<!-- Filters -->
					{#if showFilters}
						<div class="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3" transition:fade={{ duration: 150 }}>
							<div class="flex items-center justify-between">
								<span class="font-sans text-sm font-medium text-[var(--text-secondary)]">Síur</span>
								{#if hasActiveFilters}
									<button
										on:click={clearFilters}
										class="flex items-center gap-1 rounded px-2 py-1 font-sans text-xs text-[var(--accent-color)] hover:bg-[var(--accent-color)]/10"
									>
										<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
										</svg>
										Hreinsa
									</button>
								{/if}
							</div>
							<div class="mt-2">
								<label for="chapter-filter" class="mb-1 block font-sans text-xs text-[var(--text-secondary)]">
									Kafli
								</label>
								<select
									id="chapter-filter"
									bind:value={selectedChapter}
									class="w-full rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2 py-1.5 font-sans text-sm text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:outline-none"
								>
									<option value="">Allir kaflar</option>
									{#each chapters as chapter}
										<option value={chapter.slug}>{chapter.title}</option>
									{/each}
								</select>
							</div>
						</div>
					{/if}

					<!-- Indexing indicator -->
					{#if indexing}
						<div class="flex items-center justify-center gap-2 text-sm text-[var(--text-secondary)]">
							<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
							</svg>
							Byggir leitarvísitölu...
						</div>
					{/if}

					<!-- Hints and History -->
					{#if !indexing && query.length === 0}
						<div class="space-y-4">
							<div class="space-y-2 text-center">
								<p class="text-sm text-[var(--text-secondary)]">
									Sláðu inn að minnsta kosti 2 stafi til að leita
								</p>
								<p class="flex items-center justify-center gap-1 text-xs text-[var(--text-secondary)]">
									<svg class="h-3 w-3 text-[var(--accent-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
									</svg>
									Styður óbeina leit (fuzzy search)
								</p>
							</div>

							<!-- Search History -->
							{#if searchHistory.length > 0}
								<div class="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3">
									<div class="mb-2 flex items-center justify-between">
										<div class="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
											</svg>
											Nýlegar leitir
										</div>
										<button
											on:click={handleClearHistory}
											class="flex items-center gap-1 rounded px-2 py-1 font-sans text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
											title="Hreinsa sögu"
										>
											<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
											</svg>
											Hreinsa
										</button>
									</div>
									<div class="space-y-1">
										{#each searchHistory.slice(0, 5) as item}
											<div class="group flex items-center justify-between rounded px-2 py-1.5 hover:bg-[var(--bg-secondary)]">
												<button
													on:click={() => handleHistoryClick(item.query)}
													class="flex-1 text-left font-sans text-sm text-[var(--text-primary)]"
												>
													{item.query}
													<span class="ml-2 text-xs text-[var(--text-secondary)]">
														({item.resultCount} niðurstöður)
													</span>
												</button>
												<button
													on:click={() => handleRemoveHistoryItem(item.query)}
													class="rounded p-1 text-[var(--text-secondary)] opacity-0 transition-opacity hover:text-[var(--text-primary)] group-hover:opacity-100"
													title="Fjarlægja"
												>
													<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
													</svg>
												</button>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/if}

					{#if query.length > 0 && query.length < 2}
						<p class="text-center text-sm text-[var(--text-secondary)]">
							Sláðu inn fleiri stafi...
						</p>
					{/if}

					<!-- Results -->
					{#if query.length >= 2 && !loading && results.length === 0}
						<p class="text-center text-sm text-[var(--text-secondary)]">
							Engar niðurstöður fundust fyrir &quot;{query}&quot;
							{#if selectedChapter}í völdum kafla{/if}
						</p>
					{/if}

					{#if results.length > 0}
						<div class="space-y-2">
							<p class="text-sm text-[var(--text-secondary)]">
								{results.length}
								{results.length === 1 ? 'niðurstaða' : 'niðurstöður'} fundust
								{#if selectedChapter}í völdum kafla{/if}
							</p>

							<div class="max-h-96 space-y-2 overflow-y-auto">
								{#each results as result, index}
									<button
										on:click={() => handleResultClick(result)}
										class="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 text-left transition-all hover:border-[var(--accent-color)] hover:bg-[var(--accent-color)]/5"
									>
										<div class="mb-1 flex items-center justify-between">
											<div class="flex items-center gap-2">
												<svg class="h-4 w-4 text-[var(--accent-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
												</svg>
												<span class="font-sans text-sm font-semibold">
													{result.sectionNumber} {result.sectionTitle}
												</span>
											</div>
											<!-- Relevance indicator -->
											{#if result.score < 0.3}
												<span class="rounded-full bg-green-500/10 px-2 py-0.5 font-sans text-xs text-green-600 dark:text-green-400">
													Nákvæm
												</span>
											{/if}
										</div>
										<p class="mb-2 text-xs text-[var(--text-secondary)]">
											Kafli {result.chapterTitle}
										</p>
										{#if result.snippet}
											<p class="line-clamp-2 text-sm text-[var(--text-secondary)]">
												{@html highlightQuery(result.snippet, query)}
											</p>
										{/if}
										{#if result.matches > 1}
											<p class="mt-2 text-xs text-[var(--accent-color)]">
												{result.matches} samsvörun{result.matches !== 1 ? 'ar' : ''}
											</p>
										{/if}
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
