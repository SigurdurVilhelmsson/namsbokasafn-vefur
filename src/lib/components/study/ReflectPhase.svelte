<!--
  ReflectPhase - Objective confidence re-rating
-->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { WeakObjective } from '$lib/utils/studySession';
	import { objectivesStore, type ConfidenceLevel } from '$lib/stores/objectives';

	export let objectives: WeakObjective[];

	const dispatch = createEventDispatcher<{ complete: number }>();

	let currentIndex = 0;
	let completedCount = 0;

	$: currentObjective = objectives[currentIndex];
	$: total = objectives.length;
	$: progress = total > 0 ? Math.round((currentIndex / total) * 100) : 0;

	const CONFIDENCE_OPTIONS: { level: ConfidenceLevel; label: string; description: string }[] = [
		{ level: 1, label: '1', description: 'Ekki viss' },
		{ level: 2, label: '2', description: 'Óviss' },
		{ level: 3, label: '3', description: 'Nokkuð viss' },
		{ level: 4, label: '4', description: 'Viss' },
		{ level: 5, label: '5', description: 'Mjög viss' }
	];

	function rate(level: ConfidenceLevel) {
		if (!currentObjective) return;

		objectivesStore.setObjectiveConfidence(
			currentObjective.chapterSlug,
			currentObjective.sectionSlug,
			currentObjective.objectiveIndex,
			level
		);
		completedCount++;

		if (currentIndex < total - 1) {
			currentIndex++;
		} else {
			dispatch('complete', completedCount);
		}
	}
</script>

<div>
	<h2 class="rfp-heading">
		Sjálfsmat
	</h2>
	<p class="rfp-description">
		Mettu sjálfstraust þitt á þessum námsmarkmiðum.
	</p>

	<!-- Progress bar -->
	<div class="mb-4">
		<div class="rfp-progress-text">
			<span>Markmið {currentIndex + 1} af {total}</span>
			<span>{progress}%</span>
		</div>
		<div class="rfp-progress-track">
			<div
				class="rfp-progress-fill"
				style="width: {progress}%"
			></div>
		</div>
	</div>

	{#if currentObjective}
		<div class="rfp-card">
			<!-- Objective text -->
			<div class="mb-6">
				<div class="rfp-meta">
					Kafli {currentObjective.chapterSlug} / {currentObjective.sectionSlug}
				</div>
				<p class="rfp-objective-text">
					{currentObjective.objectiveText}
				</p>
				{#if currentObjective.confidence !== undefined}
					<div class="rfp-prior-rating">
						Fyrra mat: {currentObjective.confidence}/5
					</div>
				{/if}
			</div>

			<!-- Confidence scale -->
			<div>
				<p class="rfp-prompt">
					Hversu viss ertu um þetta efni?
				</p>
				<div class="grid grid-cols-5 gap-2">
					{#each CONFIDENCE_OPTIONS as option, i}
						<button
							on:click={() => rate(option.level)}
							class="rfp-confidence-btn rfp-confidence-btn--{i + 1}"
						>
							<div class="text-lg font-bold">{option.label}</div>
							<div class="text-xs mt-0.5">{option.description}</div>
						</button>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.rfp-heading {
		font-family: "Bricolage Grotesque", system-ui, sans-serif;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 0.25rem;
	}
	.rfp-description {
		font-size: 0.875rem;
		color: var(--text-secondary);
		margin-bottom: 1rem;
	}
	.rfp-progress-text {
		display: flex;
		justify-content: space-between;
		font-size: 0.875rem;
		color: var(--text-tertiary);
		margin-bottom: 0.25rem;
	}
	.rfp-progress-track {
		height: 0.5rem;
		border-radius: 9999px;
		background-color: var(--bg-tertiary);
	}
	.rfp-progress-fill {
		height: 100%;
		border-radius: 9999px;
		background-color: var(--accent-color);
		transition: width 0.3s;
	}
	.rfp-card {
		border-radius: var(--radius-xl);
		border: 1px solid var(--border-color);
		background-color: var(--bg-secondary);
		padding: 1.5rem;
	}
	.rfp-meta {
		font-size: 0.75rem;
		color: var(--text-tertiary);
		margin-bottom: 0.5rem;
	}
	.rfp-objective-text {
		color: var(--text-primary);
		font-size: 1rem;
		line-height: 1.625;
	}
	.rfp-prior-rating {
		margin-top: 0.5rem;
		font-size: 0.75rem;
		color: var(--text-tertiary);
	}
	.rfp-prompt {
		font-size: 0.875rem;
		color: var(--text-secondary);
		margin-bottom: 0.75rem;
		text-align: center;
	}
	.rfp-confidence-btn {
		padding: 0.75rem;
		border-radius: var(--radius-lg);
		transition: opacity 0.15s;
		text-align: center;
	}
	.rfp-confidence-btn:hover { opacity: 0.85; }
	/* 1 = red */
	.rfp-confidence-btn--1 { background-color: #fef2f2; color: #b91c1c; }
	:global(.dark) .rfp-confidence-btn--1 { background-color: rgba(127,29,29,0.3); color: #fca5a5; }
	/* 2 = orange */
	.rfp-confidence-btn--2 { background-color: #fff7ed; color: #c2410c; }
	:global(.dark) .rfp-confidence-btn--2 { background-color: rgba(124,45,18,0.3); color: #fdba74; }
	/* 3 = amber/accent */
	.rfp-confidence-btn--3 { background-color: var(--accent-light); color: var(--accent-color); }
	/* 4 = green */
	.rfp-confidence-btn--4 { background-color: #ecfdf5; color: #047857; }
	:global(.dark) .rfp-confidence-btn--4 { background-color: rgba(6,78,59,0.3); color: #6ee7b7; }
	/* 5 = accent solid */
	.rfp-confidence-btn--5 { background-color: var(--accent-light); color: var(--accent-color); }
</style>
