<!--
  SessionComplete - Summary screen showing time spent and items completed per phase
-->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { PhaseId } from '$lib/utils/studySession';
	import { PHASE_LABELS, PHASE_ICONS } from '$lib/utils/studySession';

	export let completedCounts: Record<PhaseId, number>;
	export let enabledPhases: PhaseId[];
	export let startTime: number;

	const dispatch = createEventDispatcher<{ reset: void }>();

	$: elapsedMs = Date.now() - startTime;
	$: elapsedMinutes = Math.max(1, Math.round(elapsedMs / 60000));
	$: totalItems = enabledPhases.reduce((sum, id) => sum + (completedCounts[id] || 0), 0);

	// Phase display colors
	const PHASE_BADGE_COLORS: Record<PhaseId, string> = {
		review: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
		reading: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
		practice: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
		reflect: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
	};
</script>

<div class="text-center py-8">
	<!-- Success icon -->
	<div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-6">
		<svg class="w-10 h-10 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
		</svg>
	</div>

	<h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
		Námslotu lokið!
	</h2>
	<p class="text-gray-500 dark:text-gray-300 mb-8">
		Vel gert. Hér er yfirlit yfir lotuna þína.
	</p>

	<!-- Stats grid -->
	<div class="grid grid-cols-2 gap-4 mb-8">
		<div class="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
			<div class="text-3xl font-bold text-gray-900 dark:text-gray-100">
				{elapsedMinutes}
			</div>
			<div class="text-sm text-gray-500 dark:text-gray-400">
				{elapsedMinutes === 1 ? 'mínúta' : 'mínútur'}
			</div>
		</div>
		<div class="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
			<div class="text-3xl font-bold text-gray-900 dark:text-gray-100">
				{totalItems}
			</div>
			<div class="text-sm text-gray-500 dark:text-gray-400">
				{totalItems === 1 ? 'atriði lokið' : 'atriðum lokið'}
			</div>
		</div>
	</div>

	<!-- Phase breakdown -->
	{#if enabledPhases.length > 0}
		<div class="mb-8 space-y-2">
			{#each enabledPhases as phaseId}
				{@const count = completedCounts[phaseId] || 0}
				<div class="flex items-center justify-between rounded-lg px-4 py-2 {PHASE_BADGE_COLORS[phaseId]}">
					<div class="flex items-center gap-2">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={PHASE_ICONS[phaseId]} />
						</svg>
						<span class="text-sm font-medium">{PHASE_LABELS[phaseId]}</span>
					</div>
					<span class="text-sm font-bold">{count}</span>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Actions -->
	<div class="flex justify-center gap-4">
		<button
			on:click={() => dispatch('reset')}
			class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
			</svg>
			Ný námslota
		</button>
	</div>
</div>
