<!--
  GoalsTab - Goal management with progress tracking
-->
<script lang="ts">
	import { analyticsStore, activeGoals, type GoalType, type GoalUnit, type GoalProgress } from '$lib/stores';

	let showAddModal = false;
	let newGoalType: GoalType = 'daily_reading_time';
	let newGoalTarget = 30;

	// Goal type configurations
	const goalTypes: { type: GoalType; label: string; unit: GoalUnit; defaultTarget: number; description: string }[] = [
		{
			type: 'daily_reading_time',
			label: 'Lesa daglega',
			unit: 'minutes',
			defaultTarget: 30,
			description: 'Lesa í ákveðinn fjölda mínútna á dag'
		},
		{
			type: 'daily_flashcards',
			label: 'Æfa minniskort',
			unit: 'cards',
			defaultTarget: 20,
			description: 'Æfa ákveðinn fjölda minniskorta á dag'
		},
		{
			type: 'weekly_sections',
			label: 'Ljúka köflum',
			unit: 'sections',
			defaultTarget: 5,
			description: 'Ljúka ákveðnum fjölda kafla í viku'
		},
		{
			type: 'streak_days',
			label: 'Halda röð daga',
			unit: 'days',
			defaultTarget: 7,
			description: 'Halda námslotu í ákveðinn fjölda daga í röð'
		}
	];

	function getGoalTypeConfig(type: GoalType) {
		return goalTypes.find((g) => g.type === type) || goalTypes[0];
	}

	function formatUnit(unit: GoalUnit, count: number): string {
		switch (unit) {
			case 'minutes':
				return count === 1 ? 'mínúta' : 'mínútur';
			case 'cards':
				return count === 1 ? 'kort' : 'kort';
			case 'sections':
				return count === 1 ? 'kafli' : 'kaflar';
			case 'days':
				return count === 1 ? 'dagur' : 'dagar';
		}
	}

	function handleAddGoal() {
		const config = getGoalTypeConfig(newGoalType);
		analyticsStore.addGoal(newGoalType, newGoalTarget, config.unit);
		showAddModal = false;
		resetForm();
	}

	function handleRemoveGoal(goalId: string) {
		if (confirm('Ertu viss um að þú viljir eyða þessu markmiði?')) {
			analyticsStore.removeGoal(goalId);
		}
	}

	function handleToggleGoal(goalId: string, isActive: boolean) {
		analyticsStore.updateGoal(goalId, { isActive: !isActive });
	}

	function resetForm() {
		newGoalType = 'daily_reading_time';
		newGoalTarget = 30;
	}

	function onTypeChange() {
		const config = getGoalTypeConfig(newGoalType);
		newGoalTarget = config.defaultTarget;
	}

	$: goalsProgress = analyticsStore.getAllGoalsProgress();
</script>

<div class="space-y-6">
	<!-- Header with Add Button -->
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Markmið</h2>
		<button
			on:click={() => (showAddModal = true)}
			class="flex items-center gap-2 px-4 py-2 bg-[var(--accent-color)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Bæta við markmiði
		</button>
	</div>

	<!-- Goals List -->
	{#if goalsProgress.length === 0}
		<div class="p-8 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
			<svg class="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
			</svg>
			<p class="text-gray-500 dark:text-gray-400 mb-4">Engin markmið skráð enn</p>
			<button
				on:click={() => (showAddModal = true)}
				class="text-[var(--accent-color)] hover:underline"
			>
				Bæta við fyrsta markmiðinu
			</button>
		</div>
	{:else}
		<div class="grid gap-4">
			{#each goalsProgress as progress}
				{@const config = getGoalTypeConfig(progress.goal.type)}
				<div
					class="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
						{progress.isComplete ? 'ring-2 ring-green-500' : ''}"
				>
					<div class="flex items-start justify-between mb-3">
						<div>
							<h3 class="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
								{config.label}
								{#if progress.isComplete}
									<span class="text-green-500">
										<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
										</svg>
									</span>
								{/if}
							</h3>
							<p class="text-sm text-gray-500 dark:text-gray-400">
								{progress.current} / {progress.goal.target} {formatUnit(progress.goal.unit, progress.goal.target)}
							</p>
						</div>
						<div class="flex items-center gap-2">
							<button
								on:click={() => handleToggleGoal(progress.goal.id, progress.goal.isActive)}
								class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
								aria-label={progress.goal.isActive ? 'Gera óvirkt' : 'Gera virkt'}
							>
								{#if progress.goal.isActive}
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
									</svg>
								{:else}
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
									</svg>
								{/if}
							</button>
							<button
								on:click={() => handleRemoveGoal(progress.goal.id)}
								class="p-1 text-gray-400 hover:text-red-500"
								aria-label="Eyða markmiði"
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
								</svg>
							</button>
						</div>
					</div>

					<!-- Progress Bar -->
					<div class="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
						<div
							class="absolute h-full rounded-full transition-all duration-500
								{progress.isComplete ? 'bg-green-500' : 'bg-[var(--accent-color)]'}"
							style="width: {progress.percentage}%"
						></div>
					</div>
					<div class="mt-2 flex justify-between text-xs">
						<span class="text-gray-500 dark:text-gray-400">{progress.percentage}%</span>
						{#if progress.isComplete}
							<span class="text-green-600 dark:text-green-400 font-medium">Lokið!</span>
						{:else}
							<span class="text-gray-500 dark:text-gray-400">
								Eftir: {progress.goal.target - progress.current} {formatUnit(progress.goal.unit, progress.goal.target - progress.current)}
							</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Suggestions -->
	<div class="p-6 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
		<h3 class="font-medium text-gray-900 dark:text-gray-100 mb-4">Tillögur</h3>
		<div class="space-y-3">
			<div class="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
				<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<span>Byrjaðu með lítil markmið og aukið þau smám saman</span>
			</div>
			<div class="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
				<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<span>Samræmi er lykillinn - betra að læra dálítið daglega</span>
			</div>
			<div class="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
				<svg class="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
				</svg>
				<span>Notaðu röð daga til að byggja upp góðar námsvenjar</span>
			</div>
		</div>
	</div>
</div>

<!-- Add Goal Modal -->
{#if showAddModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
		on:click|self={() => (showAddModal = false)}
		on:keydown={(e) => e.key === 'Escape' && (showAddModal = false)}
		role="presentation"
	>
		<div
			class="w-full max-w-md rounded-2xl bg-[var(--bg-primary)] shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="add-goal-title"
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-[var(--border-color)] px-6 py-4">
				<h2 id="add-goal-title" class="font-sans text-xl font-semibold text-[var(--text-primary)]">
					Bæta við markmiði
				</h2>
				<button
					on:click={() => (showAddModal = false)}
					class="-mr-2 rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)]"
					aria-label="Loka"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Content -->
			<div class="px-6 py-6 space-y-6">
				<!-- Goal Type -->
				<div>
					<label for="goal-type" class="block text-sm font-medium text-[var(--text-primary)] mb-2">
						Tegund markmiðs
					</label>
					<select
						id="goal-type"
						bind:value={newGoalType}
						on:change={onTypeChange}
						class="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2 text-[var(--text-primary)]"
					>
						{#each goalTypes as goalType}
							<option value={goalType.type}>{goalType.label}</option>
						{/each}
					</select>
					<p class="mt-1 text-sm text-[var(--text-secondary)]">
						{getGoalTypeConfig(newGoalType).description}
					</p>
				</div>

				<!-- Target -->
				<div>
					<label for="goal-target" class="block text-sm font-medium text-[var(--text-primary)] mb-2">
						Markmið
					</label>
					<div class="flex items-center gap-3">
						<input
							id="goal-target"
							type="number"
							min="1"
							max="999"
							bind:value={newGoalTarget}
							class="w-24 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2 text-[var(--text-primary)]"
						/>
						<span class="text-[var(--text-secondary)]">
							{formatUnit(getGoalTypeConfig(newGoalType).unit, newGoalTarget)}
						</span>
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="flex justify-end gap-3 border-t border-[var(--border-color)] px-6 py-4">
				<button
					on:click={() => (showAddModal = false)}
					class="px-4 py-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
				>
					Hætta við
				</button>
				<button
					on:click={handleAddGoal}
					class="px-4 py-2 rounded-lg bg-[var(--accent-color)] text-white hover:bg-[var(--accent-hover)] transition-colors"
				>
					Bæta við
				</button>
			</div>
		</div>
	</div>
{/if}
