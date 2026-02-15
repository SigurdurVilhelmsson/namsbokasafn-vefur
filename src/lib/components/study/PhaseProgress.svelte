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

<div class="mb-6">
	<!-- Phase steps -->
	<div class="flex items-center gap-1">
		{#each phases as phase, i}
			{@const isCompleted = completedPhases.includes(phase)}
			{@const isCurrent = phase === currentPhase}
			{@const isPast = i < currentIndex}

			{#if i > 0}
				<!-- Connector line -->
				<div class="flex-1 h-0.5 {isPast || isCompleted ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}"></div>
			{/if}

			<!-- Step indicator -->
			<div class="flex flex-col items-center">
				<div
					class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors
						{isCompleted
							? 'bg-emerald-500 text-white'
							: isCurrent
								? 'bg-blue-600 text-white ring-2 ring-blue-300 dark:ring-blue-700'
								: 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}"
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
					class="mt-1 text-xs whitespace-nowrap
						{isCurrent
							? 'font-medium text-blue-600 dark:text-blue-400'
							: isCompleted
								? 'text-emerald-600 dark:text-emerald-400'
								: 'text-gray-400 dark:text-gray-500'}"
				>
					{PHASE_LABELS[phase]}
				</span>
			</div>
		{/each}
	</div>
</div>
