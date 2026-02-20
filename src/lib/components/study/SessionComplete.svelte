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

	// Phase display colors for inline styling
	const PHASE_BADGE_STYLES: Record<PhaseId, { bg: string; text: string; bgDark: string; textDark: string }> = {
		review: { bg: '#fff7ed', text: '#c2410c', bgDark: 'rgba(124,45,18,0.3)', textDark: '#fdba74' },
		reading: { bg: '#eff6ff', text: '#1d4ed8', bgDark: 'rgba(30,64,175,0.3)', textDark: '#93c5fd' },
		practice: { bg: '#faf5ff', text: '#7e22ce', bgDark: 'rgba(88,28,135,0.3)', textDark: '#d8b4fe' },
		reflect: { bg: '#ecfdf5', text: '#047857', bgDark: 'rgba(6,78,59,0.3)', textDark: '#6ee7b7' }
	};

	let isDark = false;
	import { onMount } from 'svelte';
	onMount(() => {
		isDark = document.documentElement.classList.contains('dark');
		const observer = new MutationObserver(() => {
			isDark = document.documentElement.classList.contains('dark');
		});
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
		return () => observer.disconnect();
	});

	function getBadgeStyle(phaseId: PhaseId): string {
		const s = PHASE_BADGE_STYLES[phaseId];
		return isDark
			? `background-color: ${s.bgDark}; color: ${s.textDark};`
			: `background-color: ${s.bg}; color: ${s.text};`;
	}
</script>

<div class="text-center py-8">
	<!-- Success icon -->
	<div class="sc-success-icon">
		<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
		</svg>
	</div>

	<h2 class="sc-heading">
		Námslotu lokið!
	</h2>
	<p class="sc-description">
		Vel gert. Hér er yfirlit yfir lotuna þína.
	</p>

	<!-- Stats grid -->
	<div class="grid grid-cols-2 gap-4 mb-8">
		<div class="sc-stat-card">
			<div class="sc-stat-value">
				{elapsedMinutes}
			</div>
			<div class="sc-stat-label">
				{elapsedMinutes === 1 ? 'mínúta' : 'mínútur'}
			</div>
		</div>
		<div class="sc-stat-card">
			<div class="sc-stat-value">
				{totalItems}
			</div>
			<div class="sc-stat-label">
				{totalItems === 1 ? 'atriði lokið' : 'atriðum lokið'}
			</div>
		</div>
	</div>

	<!-- Phase breakdown -->
	{#if enabledPhases.length > 0}
		<div class="mb-8 space-y-2">
			{#each enabledPhases as phaseId}
				{@const count = completedCounts[phaseId] || 0}
				<div
					class="sc-phase-badge"
					style={getBadgeStyle(phaseId)}
				>
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
			class="sc-action-btn"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
			</svg>
			Ný námslota
		</button>
	</div>
</div>

<style>
	.sc-success-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 5rem;
		height: 5rem;
		border-radius: 9999px;
		background-color: #ecfdf5;
		color: #059669;
		margin-bottom: 1.5rem;
	}
	:global(.dark) .sc-success-icon {
		background-color: rgba(6,78,59,0.3);
		color: #34d399;
	}
	.sc-heading {
		font-family: "Bricolage Grotesque", system-ui, sans-serif;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
	}
	.sc-description {
		color: var(--text-secondary);
		margin-bottom: 2rem;
	}
	.sc-stat-card {
		padding: 1rem;
		border-radius: var(--radius-xl);
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-color);
	}
	.sc-stat-value {
		font-size: 1.875rem;
		font-weight: 700;
		color: var(--text-primary);
	}
	.sc-stat-label {
		font-size: 0.875rem;
		color: var(--text-tertiary);
	}
	.sc-phase-badge {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-radius: var(--radius-lg);
		padding: 0.5rem 1rem;
	}
	.sc-action-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		border-radius: var(--radius-xl);
		background-color: var(--accent-color);
		color: white;
		font-weight: 500;
		transition: opacity 0.15s;
	}
	.sc-action-btn:hover { opacity: 0.9; }
</style>
