<!--
  PhaseProgress - Stepper bar showing current phase in the session
-->
<script lang="ts">
	import type { PhaseId } from '$lib/utils/studySession';
	import { PHASE_LABELS } from '$lib/utils/studySession';

	export let phases: PhaseId[];
	export let currentPhase: PhaseId;
	export let completedPhases: PhaseId[] = [];

	$: currentIndex = phases.indexOf(currentPhase);
</script>

<div class="phase-progress">
	<!-- Phase steps -->
	<div class="phase-steps">
		{#each phases as phase, i}
			{@const isCompleted = completedPhases.includes(phase)}
			{@const isCurrent = phase === currentPhase}
			{@const isPast = i < currentIndex}

			{#if i > 0}
				<!-- Connector line -->
				<div class="phase-connector" class:phase-connector--done={isPast || isCompleted}></div>
			{/if}

			<!-- Step indicator -->
			<div class="phase-step">
				<div
					class="phase-dot"
					class:phase-dot--completed={isCompleted}
					class:phase-dot--current={isCurrent}
					class:phase-dot--upcoming={!isCompleted && !isCurrent}
				>
					{#if isCompleted}
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
						</svg>
					{:else}
						{i + 1}
					{/if}
				</div>
				<span
					class="phase-label"
					class:phase-label--current={isCurrent}
					class:phase-label--completed={isCompleted}
					class:phase-label--upcoming={!isCompleted && !isCurrent}
				>
					{PHASE_LABELS[phase]}
				</span>
			</div>
		{/each}
	</div>
</div>

<style>
	.phase-progress {
		margin-bottom: 1.5rem;
	}
	.phase-steps {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}
	.phase-connector {
		flex: 1;
		height: 2px;
		background-color: var(--border-color);
	}
	.phase-connector--done {
		background-color: #059669;
	}
	:global(.dark) .phase-connector--done {
		background-color: #34d399;
	}
	.phase-step {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.phase-dot {
		width: 2rem;
		height: 2rem;
		border-radius: 9999px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 500;
		transition: background-color 0.15s, color 0.15s;
	}
	.phase-dot--completed {
		background-color: #059669;
		color: white;
	}
	:global(.dark) .phase-dot--completed {
		background-color: #34d399;
		color: #022c22;
	}
	.phase-dot--current {
		background-color: var(--accent-color);
		color: white;
		outline: 2px solid color-mix(in srgb, var(--accent-color) 40%, transparent);
		outline-offset: 2px;
	}
	.phase-dot--upcoming {
		background-color: var(--bg-tertiary);
		color: var(--text-tertiary);
	}
	.phase-label {
		margin-top: 0.25rem;
		font-size: 0.75rem;
		white-space: nowrap;
	}
	.phase-label--current {
		font-weight: 500;
		color: var(--accent-color);
	}
	.phase-label--completed {
		color: #059669;
	}
	:global(.dark) .phase-label--completed {
		color: #34d399;
	}
	.phase-label--upcoming {
		color: var(--text-tertiary);
	}
</style>
