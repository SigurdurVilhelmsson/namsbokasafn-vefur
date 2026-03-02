<!--
  SessionRunner - Orchestrates active session through enabled phases
-->
<script lang="ts">
	import type { SessionPlan, PhaseId } from '$lib/utils/studySession';
	import PhaseProgress from './PhaseProgress.svelte';
	import ReviewPhase from './ReviewPhase.svelte';
	import ReadingPhase from './ReadingPhase.svelte';
	import PracticePhase from './PracticePhase.svelte';
	import ReflectPhase from './ReflectPhase.svelte';

	interface Props {
		plan: SessionPlan;
		enabledPhases: PhaseId[];
		bookSlug: string;
		oncomplete?: (counts: Record<PhaseId, number>) => void;
	}

	let { plan, enabledPhases, bookSlug, oncomplete }: Props = $props();

	let currentPhaseIndex = $state(0);
	let completedPhases: PhaseId[] = $state([]);
	let completedCounts: Record<PhaseId, number> = $state({
		review: 0,
		reading: 0,
		practice: 0,
		reflect: 0
	});

	let currentPhase = $derived(enabledPhases[currentPhaseIndex]);

	function handlePhaseComplete(phaseId: PhaseId, count: number) {
		completedCounts[phaseId] = count;
		completedPhases = [...completedPhases, phaseId];

		if (currentPhaseIndex < enabledPhases.length - 1) {
			currentPhaseIndex++;
		} else {
			oncomplete?.(completedCounts);
		}
	}

	function handleSkip() {
		completedPhases = [...completedPhases, currentPhase];

		if (currentPhaseIndex < enabledPhases.length - 1) {
			currentPhaseIndex++;
		} else {
			oncomplete?.(completedCounts);
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
				oncomplete={(count) => handlePhaseComplete('review', count)}
			/>
		{:else if currentPhase === 'reading'}
			<ReadingPhase
				sections={plan.reading.sections}
				{bookSlug}
				oncomplete={(count) => handlePhaseComplete('reading', count)}
			/>
		{:else if currentPhase === 'practice'}
			<PracticePhase
				problems={plan.practice.problems}
				oncomplete={(count) => handlePhaseComplete('practice', count)}
			/>
		{:else if currentPhase === 'reflect'}
			<ReflectPhase
				objectives={plan.reflect.objectives}
				{bookSlug}
				oncomplete={(count) => handlePhaseComplete('reflect', count)}
			/>
		{/if}
	</div>

	<!-- Skip button -->
	<div class="mt-4 flex justify-end">
		<button
			onclick={handleSkip}
			class="sr-skip-btn"
		>
			Sleppa þessum þætti
		</button>
	</div>
</div>

<style>
	.sr-skip-btn {
		font-size: 0.875rem;
		color: var(--text-tertiary);
		transition: color 0.15s;
	}
	.sr-skip-btn:hover {
		color: var(--text-primary);
	}
</style>
