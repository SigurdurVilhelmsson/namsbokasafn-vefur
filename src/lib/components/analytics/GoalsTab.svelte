<!--
  GoalsTab - Goal management with progress tracking
-->
<script lang="ts">
	import { analyticsStore, type GoalType, type GoalUnit, type GoalProgress } from '$lib/stores';
	import Icon from '$lib/components/Icon.svelte';

	let showAddModal = $state(false);
	let newGoalType: GoalType = $state('daily_reading_time');
	let newGoalTarget = $state(30);

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

	// getAllGoalsProgress reads the store via get() and registers no reactive
	// dependencies, so read $analyticsStore here to recompute on store changes
	// (goal add/remove/toggle, reading/flashcard progress)
	let goalsProgress = $derived.by(() => {
		void $analyticsStore;
		return analyticsStore.getAllGoalsProgress();
	});
</script>

<div class="space-y-6">
	<!-- Header with Add Button -->
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Markmið</h2>
		<button
			onclick={() => (showAddModal = true)}
			class="flex items-center gap-2 px-4 py-2 bg-[var(--accent-color)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
		>
			<Icon name="plus" size="sm" />
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
				onclick={() => (showAddModal = true)}
				class="text-[var(--accent-color)] hover:underline"
			>
				Bæta við fyrsta markmiðinu
			</button>
		</div>
	{:else}
		<div class="grid gap-4">
			{#each goalsProgress as progress (progress.goal.id)}
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
										<Icon name="circle-check" />
									</span>
								{/if}
							</h3>
							<p class="text-sm text-gray-500 dark:text-gray-400">
								{progress.current} / {progress.goal.target} {formatUnit(progress.goal.unit, progress.goal.target)}
							</p>
						</div>
						<div class="flex items-center gap-2">
							<button
								onclick={() => handleToggleGoal(progress.goal.id, progress.goal.isActive)}
								class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
								aria-label={progress.goal.isActive ? 'Gera óvirkt' : 'Gera virkt'}
							>
								{#if progress.goal.isActive}<Icon name="eye" />{:else}<Icon name="eye-off" />{/if}
							</button>
							<button
								onclick={() => handleRemoveGoal(progress.goal.id)}
								class="p-1 text-gray-400 hover:text-red-500"
								aria-label="Eyða markmiði"
							>
								<Icon name="trash-2" />
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
				<Icon name="info" class="text-blue-500" />
				<span>Byrjaðu með lítil markmið og aukið þau smám saman</span>
			</div>
			<div class="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
				<Icon name="circle-check" class="text-green-500" />
				<span>Samræmi er lykillinn - betra að læra dálítið daglega</span>
			</div>
			<div class="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
				<Icon name="star" class="text-purple-500" />
				<span>Notaðu röð daga til að byggja upp góðar námsvenjar</span>
			</div>
		</div>
	</div>
</div>

<!-- Add Goal Modal -->
{#if showAddModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
		onclick={(e: MouseEvent) => { if (e.target === e.currentTarget) showAddModal = false; }}
		onkeydown={(e: KeyboardEvent) => e.key === 'Escape' && (showAddModal = false)}
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
					onclick={() => (showAddModal = false)}
					class="-mr-2 rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)]"
					aria-label="Loka"
				>
					<Icon name="x" />
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
						onchange={onTypeChange}
						class="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2 text-[var(--text-primary)]"
					>
						{#each goalTypes as goalType (goalType.type)}
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
					onclick={() => (showAddModal = false)}
					class="px-4 py-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
				>
					Hætta við
				</button>
				<button
					onclick={handleAddGoal}
					class="px-4 py-2 rounded-lg bg-[var(--accent-color)] text-white hover:bg-[var(--accent-hover)] transition-colors"
				>
					Bæta við
				</button>
			</div>
		</div>
	</div>
{/if}
