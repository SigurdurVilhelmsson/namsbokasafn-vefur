<!--
  SessionPlanner - Planning screen with diagnostics, phase toggles, chapter filter
-->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { SessionPlan, PhaseId } from '$lib/utils/studySession';
	import { PHASE_LABELS, PHASE_ICONS } from '$lib/utils/studySession';
	import type { Chapter } from '$lib/types/content';

	export let plan: SessionPlan;
	export let chapters: Chapter[] = [];
	export let chapterFilter: number | undefined = undefined;
	export let bookSlug: string;

	const dispatch = createEventDispatcher<{
		start: PhaseId[];
		filterChange: number | undefined;
	}>();

	// Track which phases are toggled on/off
	let phaseToggles: Record<PhaseId, boolean> = {
		review: plan.review.enabled,
		reading: plan.reading.enabled,
		practice: plan.practice.enabled,
		reflect: plan.reflect.enabled
	};

	// Update toggles when plan changes
	$: {
		phaseToggles = {
			review: plan.review.enabled,
			reading: plan.reading.enabled,
			practice: plan.practice.enabled,
			reflect: plan.reflect.enabled
		};
	}

	$: selectedPhases = (Object.entries(phaseToggles) as [PhaseId, boolean][])
		.filter(([, on]) => on)
		.map(([id]) => id);

	$: selectedMinutes = selectedPhases.reduce((sum, id) => {
		const phase = plan[id];
		return sum + phase.estimatedMinutes;
	}, 0);

	function togglePhase(id: PhaseId) {
		const phase = plan[id];
		if (!phase.enabled) return; // Can't toggle disabled phases
		phaseToggles[id] = !phaseToggles[id];
	}

	function handleFilterChange(e: Event) {
		const value = (e.target as HTMLSelectElement).value;
		dispatch('filterChange', value ? parseInt(value, 10) : undefined);
	}

	function handleStart() {
		if (selectedPhases.length > 0) {
			dispatch('start', selectedPhases);
		}
	}

	// Phase colors for inline styling (CSS variables + semantic colors)
	const PHASE_INLINE_COLORS: Record<PhaseId, { bg: string; text: string; border: string; iconColor: string; dotBg: string }> = {
		review: {
			bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', iconColor: '#f97316', dotBg: '#f97316'
		},
		reading: {
			bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', iconColor: '#3b82f6', dotBg: '#3b82f6'
		},
		practice: {
			bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff', iconColor: '#a855f7', dotBg: '#a855f7'
		},
		reflect: {
			bg: '#ecfdf5', text: '#047857', border: '#a7f3d0', iconColor: '#10b981', dotBg: '#10b981'
		}
	};
	const PHASE_INLINE_COLORS_DARK: Record<PhaseId, { bg: string; text: string; border: string; iconColor: string; dotBg: string }> = {
		review: {
			bg: 'rgba(124,45,18,0.2)', text: '#fdba74', border: 'rgba(124,45,18,0.5)', iconColor: '#fb923c', dotBg: '#fb923c'
		},
		reading: {
			bg: 'rgba(30,64,175,0.2)', text: '#93c5fd', border: 'rgba(30,64,175,0.5)', iconColor: '#60a5fa', dotBg: '#60a5fa'
		},
		practice: {
			bg: 'rgba(88,28,135,0.2)', text: '#d8b4fe', border: 'rgba(88,28,135,0.5)', iconColor: '#c084fc', dotBg: '#c084fc'
		},
		reflect: {
			bg: 'rgba(6,78,59,0.2)', text: '#6ee7b7', border: 'rgba(6,78,59,0.5)', iconColor: '#34d399', dotBg: '#34d399'
		}
	};

	// Detect dark mode
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

	function getPhaseColors(phaseId: PhaseId) {
		return isDark ? PHASE_INLINE_COLORS_DARK[phaseId] : PHASE_INLINE_COLORS[phaseId];
	}
</script>

<div>
	<h1 class="sp-heading">
		Námslota
	</h1>
	<p class="sp-description">
		Skipuleggðu námstíma þinn. Kerfið greinir hvað þarfnast athygli.
	</p>

	<!-- Chapter filter -->
	{#if chapters.length > 1}
		<div class="mb-6">
			<label for="chapter-filter" class="sp-label">
				Afmarka við kafla
			</label>
			<select
				id="chapter-filter"
				class="sp-select"
				value={chapterFilter ?? ''}
				on:change={handleFilterChange}
			>
				<option value="">Allir kaflar</option>
				{#each chapters as chapter}
					<option value={chapter.number}>
						Kafli {chapter.number}: {chapter.title}
					</option>
				{/each}
			</select>
		</div>
	{/if}

	{#if plan.isEmpty}
		<!-- All caught up -->
		<div class="text-center py-12">
			<div class="sp-success-icon">
				<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
			</div>
			<h2 class="sp-subheading">
				Vel gert!
			</h2>
			<p class="sp-description" style="margin-bottom: 1rem;">
				Ekkert þarfnast athygli eins og er. Haltu áfram gullinu!
			</p>
			<a href="/{bookSlug}" class="sp-back-link">
				Til baka í bók
			</a>
		</div>
	{:else}
		<!-- Phase cards -->
		<div class="space-y-3 mb-8">
			{#each (['review', 'reading', 'practice', 'reflect'] as PhaseId[]) as phaseId}
				{@const phase = plan[phaseId]}
				{@const colors = getPhaseColors(phaseId)}
				<button
					class="sp-phase-card"
					class:sp-phase-card--disabled={!phase.enabled}
					style={phase.enabled && phaseToggles[phaseId]
						? `border-color: ${colors.border}; background-color: ${colors.bg};`
						: phase.enabled
							? ''
							: ''}
					disabled={!phase.enabled}
					on:click={() => togglePhase(phaseId)}
				>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<!-- Toggle indicator -->
							<div
								class="sp-toggle"
								style={phase.enabled && phaseToggles[phaseId]
									? `border-color: ${colors.border}; background-color: ${colors.bg};`
									: ''}
							>
								{#if phase.enabled && phaseToggles[phaseId]}
									<div class="sp-toggle-dot" style="background-color: {colors.dotBg};"></div>
								{/if}
							</div>

							<!-- Phase icon -->
							<svg
								class="w-5 h-5"
								style="color: {phase.enabled ? colors.iconColor : 'var(--text-tertiary)'};"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={PHASE_ICONS[phaseId]} />
							</svg>

							<!-- Phase label -->
							<div>
								<span class="font-medium" style="color: {phase.enabled ? 'var(--text-primary)' : 'var(--text-tertiary)'};">
									{PHASE_LABELS[phaseId]}
								</span>
								{#if phase.enabled}
									<span class="ml-2 text-sm" style="color: {colors.text};">
										{phase.itemCount} {phase.itemCount === 1 ? 'atriði' : 'atriði'}
									</span>
								{:else}
									<span class="ml-2 text-sm" style="color: var(--text-tertiary);">
										Ekkert til
									</span>
								{/if}
							</div>
						</div>

						<!-- Time estimate -->
						{#if phase.enabled}
							<span class="text-sm" style="color: var(--text-tertiary);">
								~{phase.estimatedMinutes} mín
							</span>
						{/if}
					</div>
				</button>
			{/each}
		</div>

		<!-- Summary and start -->
		<div class="flex items-center justify-between">
			<div class="text-sm" style="color: var(--text-tertiary);">
				{#if selectedPhases.length > 0}
					{selectedPhases.length} {selectedPhases.length === 1 ? 'þáttur' : 'þættir'} &middot; ~{selectedMinutes} mín
				{:else}
					Veldu a.m.k. einn þátt
				{/if}
			</div>

			<button
				on:click={handleStart}
				disabled={selectedPhases.length === 0}
				class="sp-start-btn"
				class:sp-start-btn--disabled={selectedPhases.length === 0}
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				Hefja nám
			</button>
		</div>
	{/if}
</div>

<style>
	.sp-heading {
		font-family: "Bricolage Grotesque", system-ui, sans-serif;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
	}
	.sp-subheading {
		font-family: "Bricolage Grotesque", system-ui, sans-serif;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
	}
	.sp-description {
		color: var(--text-secondary);
		margin-bottom: 1.5rem;
	}
	.sp-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-secondary);
		margin-bottom: 0.25rem;
	}
	.sp-select {
		width: 100%;
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-color);
		background-color: var(--bg-secondary);
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		color: var(--text-primary);
	}
	.sp-success-icon {
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
	:global(.dark) .sp-success-icon {
		background-color: rgba(6, 78, 59, 0.3);
		color: #34d399;
	}
	.sp-back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border-radius: var(--radius-lg);
		background-color: var(--bg-secondary);
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
		font-size: 0.875rem;
		transition: background-color 0.15s;
	}
	.sp-back-link:hover {
		background-color: var(--bg-tertiary);
	}
	.sp-phase-card {
		width: 100%;
		text-align: left;
		border-radius: var(--radius-xl);
		border: 1px solid var(--border-color);
		background-color: var(--bg-secondary);
		padding: 1rem;
		transition: all 0.15s;
	}
	.sp-phase-card--disabled {
		background-color: var(--bg-tertiary);
		opacity: 0.4;
		cursor: not-allowed;
	}
	.sp-toggle {
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 9999px;
		border: 2px solid var(--border-color);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.sp-toggle-dot {
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 9999px;
	}
	.sp-start-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		font-size: 1.125rem;
		font-weight: 500;
		border-radius: var(--radius-xl);
		background-color: var(--accent-color);
		color: white;
		transition: opacity 0.15s;
	}
	.sp-start-btn:hover:not(:disabled) {
		opacity: 0.9;
	}
	.sp-start-btn--disabled {
		background-color: var(--bg-tertiary);
		color: var(--text-tertiary);
		cursor: not-allowed;
	}
</style>
