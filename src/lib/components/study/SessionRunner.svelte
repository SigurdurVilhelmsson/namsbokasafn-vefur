<!--
  SessionRunner - Orchestrates active session through enabled phases
-->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { SessionPlan, PhaseId } from '$lib/utils/studySession';
	import PhaseProgress from './PhaseProgress.svelte';
	import ReviewPhase from './ReviewPhase.svelte';
	import ReadingPhase from './ReadingPhase.svelte';
	import PracticePhase from './PracticePhase.svelte';
	import ReflectPhase from './ReflectPhase.svelte';

	export let plan: SessionPlan;
	export let enabledPhases: PhaseId[];
	export let bookSlug: string;

	const dispatch = createEventDispatcher<{
		complete: Record<PhaseId, number>;
	}>();

	let currentPhaseIndex = 0;
	let completedPhases: PhaseId[] = [];
	let completedCounts: Record<PhaseId, number> = {
		review: 0,
		reading: 0,
		practice: 0,
		reflect: 0
	};

	$: currentPhase = enabledPhases[currentPhaseIndex];

	function handlePhaseComplete(phaseId: PhaseId, count: number) {
		completedCounts[phaseId] = count;
		completedPhases = [...completedPhases, phaseId];

		if (currentPhaseIndex < enabledPhases.length - 1) {
			currentPhaseIndex++;
		} else {
			dispatch('complete', completedCounts);
		}
	}

	function handleSkip() {
		completedPhases = [...completedPhases, currentPhase];

		if (currentPhaseIndex < enabledPhases.length - 1) {
			currentPhaseIndex++;
		} else {
			dispatch('complete', completedCounts);
		}
	}
</script>

<div>
	<PhaseProgress
		phases={enabledPhases}
		{currentPhase}
		{completedPhases}
	/>

	<!-- Phase content -->
	<div class="min-h-[300px]">
		{#if currentPhase === 'review'}
			<ReviewPhase
				dueFlashcards={plan.review.dueFlashcards}
				reviewProblems={plan.review.reviewProblems}
				on:complete={(e) => handlePhaseComplete('review', e.detail)}
			/>
		{:else if currentPhase === 'reading'}
			<ReadingPhase
				sections={plan.reading.sections}
				{bookSlug}
				on:complete={(e) => handlePhaseComplete('reading', e.detail)}
			/>
		{:else if currentPhase === 'practice'}
			<PracticePhase
				problems={plan.practice.problems}
				on:complete={(e) => handlePhaseComplete('practice', e.detail)}
			/>
		{:else if currentPhase === 'reflect'}
			<ReflectPhase
				objectives={plan.reflect.objectives}
				on:complete={(e) => handlePhaseComplete('reflect', e.detail)}
			/>
		{/if}
	</div>

	<!-- Skip button -->
	<div class="mt-4 flex justify-end">
		<button
			on:click={handleSkip}
			class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
		>
			Sleppa þessum þætti
		</button>
	</div>
</div>
