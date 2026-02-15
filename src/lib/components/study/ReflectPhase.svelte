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

	const CONFIDENCE_OPTIONS: { level: ConfidenceLevel; label: string; description: string; color: string }[] = [
		{ level: 1, label: '1', description: 'Ekki viss', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50' },
		{ level: 2, label: '2', description: 'Óviss', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50' },
		{ level: 3, label: '3', description: 'Nokkuð viss', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50' },
		{ level: 4, label: '4', description: 'Viss', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50' },
		{ level: 5, label: '5', description: 'Mjög viss', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50' }
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
	<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
		Sjálfsmat
	</h2>
	<p class="text-sm text-gray-500 dark:text-gray-300 mb-4">
		Mettu sjálfstraust þitt á þessum námsmarkmiðum.
	</p>

	<!-- Progress bar -->
	<div class="mb-4">
		<div class="flex justify-between text-sm text-gray-500 dark:text-gray-300 mb-1">
			<span>Markmið {currentIndex + 1} af {total}</span>
			<span>{progress}%</span>
		</div>
		<div class="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
			<div
				class="h-full rounded-full bg-emerald-500 transition-all duration-300"
				style="width: {progress}%"
			></div>
		</div>
	</div>

	{#if currentObjective}
		<div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
			<!-- Objective text -->
			<div class="mb-6">
				<div class="text-xs text-gray-500 dark:text-gray-400 mb-2">
					Kafli {currentObjective.chapterSlug} / {currentObjective.sectionSlug}
				</div>
				<p class="text-gray-900 dark:text-gray-100 text-base leading-relaxed">
					{currentObjective.objectiveText}
				</p>
				{#if currentObjective.confidence !== undefined}
					<div class="mt-2 text-xs text-gray-400 dark:text-gray-500">
						Fyrra mat: {currentObjective.confidence}/5
					</div>
				{/if}
			</div>

			<!-- Confidence scale -->
			<div>
				<p class="text-sm text-gray-500 dark:text-gray-300 mb-3 text-center">
					Hversu viss ertu um þetta efni?
				</p>
				<div class="grid grid-cols-5 gap-2">
					{#each CONFIDENCE_OPTIONS as option}
						<button
							on:click={() => rate(option.level)}
							class="p-3 rounded-lg transition-colors text-center {option.color}"
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
