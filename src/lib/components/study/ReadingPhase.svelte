<!--
  ReadingPhase - Section recommendation cards with navigation links
-->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { UnreadSection } from '$lib/utils/studySession';
	import { reader } from '$lib/stores/reader';

	export let sections: UnreadSection[];
	export let bookSlug: string;

	const dispatch = createEventDispatcher<{ complete: number }>();

	let completedCount = 0;
	let markedDone: Set<number> = new Set();

	function markDone(index: number) {
		if (markedDone.has(index)) return;

		const section = sections[index];
		reader.markAsRead(section.chapterSlug, section.sectionSlug);
		markedDone = new Set([...markedDone, index]);
		completedCount++;

		// Auto-complete when all sections are done
		if (markedDone.size === sections.length) {
			dispatch('complete', completedCount);
		}
	}

	function finish() {
		dispatch('complete', completedCount);
	}
</script>

<div>
	<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
		Lestur
	</h2>
	<p class="text-sm text-gray-500 dark:text-gray-300 mb-4">
		Lestu eftirfarandi kafla. Smelltu á „Lesið" þegar þú hefur lokið.
	</p>

	<div class="space-y-3">
		{#each sections as section, i}
			{@const isDone = markedDone.has(i)}
			<div
				class="rounded-xl border p-4 transition-all
					{isDone
						? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20'
						: 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}"
			>
				<div class="flex items-start justify-between gap-3">
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 mb-1">
							<span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium
								{isDone
									? 'bg-emerald-500 text-white'
									: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}">
								{#if isDone}
									<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
									</svg>
								{:else}
									{section.sectionNumber || (i + 1)}
								{/if}
							</span>
							<h3 class="font-medium text-gray-900 dark:text-gray-100 truncate {isDone ? 'line-through opacity-60' : ''}">
								{section.sectionTitle}
							</h3>
						</div>
						<div class="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
							<span>Kafli {section.chapterNumber}: {section.chapterTitle}</span>
							<span>~{section.readingTime} mín</span>
						</div>
					</div>

					<div class="flex items-center gap-2 shrink-0">
						{#if !isDone}
							<a
								href="/{bookSlug}/kafli/{section.chapterSlug}/{section.sectionSlug}"
								class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
								target="_blank"
								rel="noopener"
							>
								Lesa
								<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
								</svg>
							</a>
							<button
								on:click={() => markDone(i)}
								class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
							>
								Lesið
							</button>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Finish button -->
	<div class="mt-6 flex justify-end">
		<button
			on:click={finish}
			class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
		>
			{markedDone.size === sections.length ? 'Áfram' : 'Halda áfram'}
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		</button>
	</div>
</div>
