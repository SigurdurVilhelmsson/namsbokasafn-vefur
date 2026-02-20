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
	<h2 class="rdp-heading">
		Lestur
	</h2>
	<p class="rdp-description">
		Lestu eftirfarandi kafla. Smelltu á „Lesið" þegar þú hefur lokið.
	</p>

	<div class="space-y-3">
		{#each sections as section, i}
			{@const isDone = markedDone.has(i)}
			<div class="rdp-section-card" class:rdp-section-card--done={isDone}>
				<div class="flex items-start justify-between gap-3">
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 mb-1">
							<span class="rdp-badge" class:rdp-badge--done={isDone}>
								{#if isDone}
									<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
									</svg>
								{:else}
									{section.sectionNumber || (i + 1)}
								{/if}
							</span>
							<h3 class="rdp-section-title" class:rdp-section-title--done={isDone}>
								{section.sectionTitle}
							</h3>
						</div>
						<div class="rdp-meta">
							<span>Kafli {section.chapterNumber}: {section.chapterTitle}</span>
							<span>~{section.readingTime} mín</span>
						</div>
					</div>

					<div class="flex items-center gap-2 shrink-0">
						{#if !isDone}
							<a
								href="/{bookSlug}/kafli/{section.chapterSlug}/{section.sectionSlug}"
								class="rdp-read-link"
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
								class="rdp-done-btn"
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
		<button on:click={finish} class="rdp-finish-btn">
			{markedDone.size === sections.length ? 'Áfram' : 'Halda áfram'}
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		</button>
	</div>
</div>

<style>
	.rdp-heading {
		font-family: "Bricolage Grotesque", system-ui, sans-serif;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 0.25rem;
	}
	.rdp-description {
		font-size: 0.875rem;
		color: var(--text-secondary);
		margin-bottom: 1rem;
	}
	.rdp-section-card {
		border-radius: var(--radius-xl);
		border: 1px solid var(--border-color);
		background-color: var(--bg-secondary);
		padding: 1rem;
		transition: all 0.15s;
	}
	.rdp-section-card--done {
		border-color: #86efac;
		background-color: #ecfdf5;
	}
	:global(.dark) .rdp-section-card--done {
		border-color: rgba(6,78,59,0.5);
		background-color: rgba(6,78,59,0.2);
	}
	.rdp-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 500;
		background-color: var(--accent-light);
		color: var(--accent-color);
	}
	.rdp-badge--done {
		background-color: #059669;
		color: white;
	}
	:global(.dark) .rdp-badge--done {
		background-color: #34d399;
		color: #022c22;
	}
	.rdp-section-title {
		font-weight: 500;
		color: var(--text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.rdp-section-title--done {
		text-decoration: line-through;
		opacity: 0.6;
	}
	.rdp-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.75rem;
		color: var(--text-tertiary);
	}
	.rdp-read-link {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.375rem 0.75rem;
		border-radius: var(--radius-lg);
		font-size: 0.875rem;
		color: var(--accent-color);
		background-color: var(--accent-light);
		transition: opacity 0.15s;
	}
	.rdp-read-link:hover { opacity: 0.85; }
	.rdp-done-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.375rem 0.75rem;
		border-radius: var(--radius-lg);
		font-size: 0.875rem;
		color: #059669;
		background-color: #ecfdf5;
		transition: opacity 0.15s;
	}
	:global(.dark) .rdp-done-btn {
		color: #34d399;
		background-color: rgba(6,78,59,0.2);
	}
	.rdp-done-btn:hover { opacity: 0.85; }
	.rdp-finish-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border-radius: var(--radius-lg);
		background-color: var(--accent-color);
		color: white;
		font-size: 0.875rem;
		font-weight: 500;
		transition: opacity 0.15s;
	}
	.rdp-finish-btn:hover { opacity: 0.9; }
</style>
