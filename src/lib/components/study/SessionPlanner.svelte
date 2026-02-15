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

	// Phase colors
	const PHASE_COLORS: Record<PhaseId, { bg: string; text: string; border: string; icon: string }> = {
		review: {
			bg: 'bg-orange-50 dark:bg-orange-900/20',
			text: 'text-orange-700 dark:text-orange-300',
			border: 'border-orange-200 dark:border-orange-800',
			icon: 'text-orange-500'
		},
		reading: {
			bg: 'bg-blue-50 dark:bg-blue-900/20',
			text: 'text-blue-700 dark:text-blue-300',
			border: 'border-blue-200 dark:border-blue-800',
			icon: 'text-blue-500'
		},
		practice: {
			bg: 'bg-purple-50 dark:bg-purple-900/20',
			text: 'text-purple-700 dark:text-purple-300',
			border: 'border-purple-200 dark:border-purple-800',
			icon: 'text-purple-500'
		},
		reflect: {
			bg: 'bg-emerald-50 dark:bg-emerald-900/20',
			text: 'text-emerald-700 dark:text-emerald-300',
			border: 'border-emerald-200 dark:border-emerald-800',
			icon: 'text-emerald-500'
		}
	};
</script>

<div>
	<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
		Námslota
	</h1>
	<p class="text-gray-500 dark:text-gray-300 mb-6">
		Skipuleggðu námstíma þinn. Kerfið greinir hvað þarfnast athygli.
	</p>

	<!-- Chapter filter -->
	{#if chapters.length > 1}
		<div class="mb-6">
			<label for="chapter-filter" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
				Afmarka við kafla
			</label>
			<select
				id="chapter-filter"
				class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
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
			<div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-6">
				<svg class="w-10 h-10 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
			</div>
			<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
				Vel gert!
			</h2>
			<p class="text-gray-600 dark:text-gray-300 mb-4">
				Ekkert þarfnast athygli eins og er. Haltu áfram gullinu!
			</p>
			<a
				href="/{bookSlug}"
				class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
			>
				Til baka í bók
			</a>
		</div>
	{:else}
		<!-- Phase cards -->
		<div class="space-y-3 mb-8">
			{#each (['review', 'reading', 'practice', 'reflect'] as PhaseId[]) as phaseId}
				{@const phase = plan[phaseId]}
				{@const colors = PHASE_COLORS[phaseId]}
				<button
					class="w-full text-left rounded-xl border p-4 transition-all
						{phase.enabled
							? phaseToggles[phaseId]
								? `${colors.border} ${colors.bg}`
								: 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 opacity-60'
							: 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 opacity-40 cursor-not-allowed'}"
					disabled={!phase.enabled}
					on:click={() => togglePhase(phaseId)}
				>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<!-- Toggle indicator -->
							<div class="w-5 h-5 rounded-full border-2 flex items-center justify-center
								{phase.enabled && phaseToggles[phaseId]
									? `${colors.border} ${colors.bg}`
									: 'border-gray-300 dark:border-gray-600'}"
							>
								{#if phase.enabled && phaseToggles[phaseId]}
									<div class="w-2.5 h-2.5 rounded-full {colors.icon.replace('text-', 'bg-')}"></div>
								{/if}
							</div>

							<!-- Phase icon -->
							<svg class="w-5 h-5 {phase.enabled ? colors.icon : 'text-gray-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={PHASE_ICONS[phaseId]} />
							</svg>

							<!-- Phase label -->
							<div>
								<span class="font-medium {phase.enabled ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}">
									{PHASE_LABELS[phaseId]}
								</span>
								{#if phase.enabled}
									<span class="ml-2 text-sm {colors.text}">
										{phase.itemCount} {phase.itemCount === 1 ? 'atriði' : 'atriði'}
									</span>
								{:else}
									<span class="ml-2 text-sm text-gray-400 dark:text-gray-500">
										Ekkert til
									</span>
								{/if}
							</div>
						</div>

						<!-- Time estimate -->
						{#if phase.enabled}
							<span class="text-sm text-gray-500 dark:text-gray-400">
								~{phase.estimatedMinutes} mín
							</span>
						{/if}
					</div>
				</button>
			{/each}
		</div>

		<!-- Summary and start -->
		<div class="flex items-center justify-between">
			<div class="text-sm text-gray-500 dark:text-gray-400">
				{#if selectedPhases.length > 0}
					{selectedPhases.length} {selectedPhases.length === 1 ? 'þáttur' : 'þættir'} &middot; ~{selectedMinutes} mín
				{:else}
					Veldu a.m.k. einn þátt
				{/if}
			</div>

			<button
				on:click={handleStart}
				disabled={selectedPhases.length === 0}
				class="inline-flex items-center gap-2 px-6 py-3 text-lg font-medium rounded-xl transition-colors
					{selectedPhases.length > 0
						? 'bg-blue-600 text-white hover:bg-blue-700'
						: 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'}"
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
