<!--
  AnnotationSidebar - Shows all annotations with filtering and export
-->
<script lang="ts">
	import { slide, fade } from 'svelte/transition';
	import { annotationStore } from '$lib/stores/annotation';
	import type { Annotation, HighlightColor } from '$lib/types/annotation';

	export let isOpen: boolean;
	export let onClose: () => void;
	export let bookSlug: string;
	export let currentChapter: string | undefined = undefined;
	export let currentSection: string | undefined = undefined;

	type FilterType = 'all' | 'current' | HighlightColor;

	const COLOR_LABELS: Record<HighlightColor, string> = {
		yellow: 'Gulur',
		green: 'Gulbrúnn',
		blue: 'Blár',
		pink: 'Rósrauður'
	};

	const COLOR_STYLES: Record<HighlightColor, { bg: string; border: string; darkBg: string; swatch: string }> = {
		yellow: { bg: '#f5e6b8', border: '#e0d0a0', darkBg: 'rgba(196, 160, 60, 0.2)', swatch: '#f5e6b8' },
		green: { bg: '#f0d0a0', border: '#dabb88', darkBg: 'rgba(192, 140, 60, 0.2)', swatch: '#f0d0a0' },
		blue: { bg: '#c8daf0', border: '#a8c0e0', darkBg: 'rgba(80, 120, 200, 0.2)', swatch: '#c8daf0' },
		pink: { bg: '#f0c8c8', border: '#dab0b0', darkBg: 'rgba(200, 100, 100, 0.2)', swatch: '#f0c8c8' }
	};

	let filter: FilterType = 'all';
	let showFilterMenu = false;
	let confirmDelete: string | null = null;

	// Subscribe to annotation store
	$: allAnnotations = $annotationStore.annotations.filter((a) => a.bookSlug === bookSlug);

	// Filter annotations
	$: filteredAnnotations = (() => {
		let result = allAnnotations;

		if (filter === 'current' && currentChapter && currentSection) {
			result = result.filter(
				(a) => a.chapterSlug === currentChapter && a.sectionSlug === currentSection
			);
		} else if (filter === 'yellow' || filter === 'green' || filter === 'blue' || filter === 'pink') {
			result = result.filter((a) => a.color === filter);
		}

		// Sort by date, newest first
		return result.sort(
			(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
		);
	})();

	// Stats
	$: stats = (() => {
		const byColor: Record<HighlightColor, number> = { yellow: 0, green: 0, blue: 0, pink: 0 };
		let withNotes = 0;

		allAnnotations.forEach((ann) => {
			byColor[ann.color]++;
			if (ann.note) withNotes++;
		});

		return {
			total: allAnnotations.length,
			byColor,
			withNotes
		};
	})();

	// Handle export
	function handleExport() {
		const markdown = annotationStore.exportAnnotations(bookSlug);
		const blob = new Blob([markdown], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `athugasemdir-${bookSlug}-${new Date().toISOString().split('T')[0]}.md`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	// Handle delete
	function handleDelete(id: string) {
		annotationStore.removeAnnotation(id);
		confirmDelete = null;
	}

	function getFilterLabel(f: FilterType): string {
		if (f === 'all') return 'Allt';
		if (f === 'current') return 'Thessi kafli';
		return COLOR_LABELS[f as HighlightColor];
	}
</script>

{#if isOpen}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-40 bg-black/20"
		on:click={onClose}
		on:keydown={(e) => e.key === 'Escape' && onClose()}
		role="presentation"
		tabindex="-1"
		transition:fade={{ duration: 150 }}
	></div>

	<!-- Sidebar -->
	<div
		class="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl"
		role="dialog"
		aria-label="Athugasemdir"
		transition:slide={{ duration: 200, axis: 'x' }}
	>
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-4">
			<div class="flex items-center gap-2">
				<svg
					class="w-5 h-5 text-[var(--accent-color)]"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
					/>
				</svg>
				<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Athugasemdir</h2>
				<span class="rounded-full bg-[var(--accent-light)] px-2 py-0.5 text-xs font-medium text-[var(--accent-color)]">
					{filteredAnnotations.length}
				</span>
			</div>
			<button
				on:click={onClose}
				class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
				aria-label="Loka"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Filter and actions bar -->
		<div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-2">
			<!-- Filter dropdown -->
			<div class="relative">
				<button
					on:click={() => (showFilterMenu = !showFilterMenu)}
					class="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
					aria-expanded={showFilterMenu}
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
						/>
					</svg>
					<span>{getFilterLabel(filter)}</span>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>

				{#if showFilterMenu}
					<div
						class="absolute left-0 top-full z-10 mt-1 w-44 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-1 shadow-lg"
						transition:slide={{ duration: 100 }}
					>
						<button
							on:click={() => {
								filter = 'all';
								showFilterMenu = false;
							}}
							class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 {filter === 'all'
								? 'text-[var(--accent-color)]'
								: 'text-gray-700 dark:text-gray-300'}"
						>
							Allt ({stats.total})
						</button>
						{#if currentChapter && currentSection}
							<button
								on:click={() => {
									filter = 'current';
									showFilterMenu = false;
								}}
								class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 {filter === 'current'
									? 'text-[var(--accent-color)]'
									: 'text-gray-700 dark:text-gray-300'}"
							>
								Thessi kafli
							</button>
						{/if}
						<hr class="my-1 border-gray-200 dark:border-gray-700" />
						{#each Object.entries(COLOR_LABELS) as [color, label]}
							<button
								on:click={() => {
									filter = color as HighlightColor;
									showFilterMenu = false;
								}}
								class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 {filter === color
									? 'text-[var(--accent-color)]'
									: 'text-gray-700 dark:text-gray-300'}"
							>
								<span
									class="h-3 w-3 rounded-full border"
									style="background-color: {COLOR_STYLES[color as HighlightColor].swatch}; border-color: {COLOR_STYLES[color as HighlightColor].border};"
								></span>
								{label} ({stats.byColor[color as HighlightColor]})
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Export button -->
			<button
				on:click={handleExport}
				disabled={stats.total === 0}
				class="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-500 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
				title="Flytja ut sem Markdown"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
					/>
				</svg>
				<span class="hidden sm:inline">Flytja ut</span>
			</button>
		</div>

		<!-- Annotations list -->
		<div class="flex-1 overflow-y-auto p-4">
			{#if filteredAnnotations.length === 0}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<svg
						class="w-12 h-12 mb-4 text-gray-300 dark:text-gray-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
						/>
					</svg>
					<p class="text-gray-500 dark:text-gray-300">Engar athugasemdir fundust</p>
					<p class="mt-2 text-sm text-gray-400 dark:text-gray-500">
						Veldu texta til að yfirstrika eða bæta við athugasemd
					</p>
				</div>
			{:else}
				<div class="space-y-3">
					{#each filteredAnnotations as annotation (annotation.id)}
						{@const colors = COLOR_STYLES[annotation.color]}
						<div
							class="annotation-card rounded-lg border p-3 transition-shadow hover:shadow-md"
							style="--card-bg: {colors.bg}; --card-border: {colors.border}; --card-dark-bg: {colors.darkBg};"
							transition:slide={{ duration: 150 }}
						>
							<!-- Header -->
							<div class="mb-2 flex items-start justify-between">
								<span class="text-xs font-medium text-gray-500 dark:text-gray-300">
									{annotation.chapterSlug} / {annotation.sectionSlug}
								</span>
								<span class="text-xs text-gray-500 dark:text-gray-300">
									{new Date(annotation.createdAt).toLocaleDateString('is-IS')}
								</span>
							</div>

							<!-- Selected text -->
							<p class="mb-2 text-sm italic text-gray-700 dark:text-gray-300">
								"{annotation.selectedText.length > 150
									? `${annotation.selectedText.slice(0, 150)}...`
									: annotation.selectedText}"
							</p>

							<!-- Note if present -->
							{#if annotation.note}
								<div class="mb-2 flex items-start gap-2 rounded bg-white/50 dark:bg-black/20 p-2">
									<svg
										class="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										aria-hidden="true"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
										/>
									</svg>
									<p class="text-sm text-gray-700 dark:text-gray-300">{annotation.note}</p>
								</div>
							{/if}

							<!-- Actions -->
							<div class="flex justify-end">
								{#if confirmDelete === annotation.id}
									<div class="flex items-center gap-2">
										<span class="text-xs text-red-600 dark:text-red-400">Eyda?</span>
										<button
											on:click={() => handleDelete(annotation.id)}
											class="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
										>
											Ja
										</button>
										<button
											on:click={() => (confirmDelete = null)}
											class="rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-black/20"
										>
											Nei
										</button>
									</div>
								{:else}
									<button
										on:click={() => (confirmDelete = annotation.id)}
										class="rounded p-1 text-gray-400 transition-colors hover:bg-white/50 dark:hover:bg-black/20 hover:text-red-600 dark:hover:text-red-400"
										aria-label="Eyda athugasemd"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
											/>
										</svg>
									</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Stats footer -->
		{#if stats.total > 0}
			<div class="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
				<div class="flex items-center justify-between text-sm text-gray-500 dark:text-gray-300">
					<span>
						{stats.total} yfirstrikun{stats.total !== 1 ? 'ar' : ''}
					</span>
					<span>
						{stats.withNotes} med athugasemd{stats.withNotes !== 1 ? 'um' : ''}
					</span>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.annotation-card {
		background-color: var(--card-bg);
		border-color: var(--card-border);
	}

	:global(.dark) .annotation-card {
		background-color: var(--card-dark-bg);
		border-color: var(--card-border);
	}
</style>
