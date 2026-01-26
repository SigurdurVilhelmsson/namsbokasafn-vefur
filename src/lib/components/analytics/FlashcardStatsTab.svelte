<!--
  FlashcardStatsTab - Flashcard success rate chart and statistics
-->
<script lang="ts">
	import { flashcardStore, flashcardSuccessRate, weeklyFlashcardStats } from '$lib/stores';
	import { getTodayDateString } from '$lib/utils/storeHelpers';

	// Format date for display
	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('is-IS', {
			weekday: 'short'
		});
	}

	// Get rating distribution from weekly stats
	function getRatingDistribution() {
		const stats = $weeklyFlashcardStats;
		const totals = stats.reduce(
			(acc, day) => ({
				again: acc.again + day.againCount,
				hard: acc.hard + day.hardCount,
				good: acc.good + day.goodCount,
				easy: acc.easy + day.easyCount
			}),
			{ again: 0, hard: 0, good: 0, easy: 0 }
		);

		const total = totals.again + totals.hard + totals.good + totals.easy;
		if (total === 0) return { again: 0, hard: 0, good: 0, easy: 0, total: 0 };

		return {
			again: Math.round((totals.again / total) * 100),
			hard: Math.round((totals.hard / total) * 100),
			good: Math.round((totals.good / total) * 100),
			easy: Math.round((totals.easy / total) * 100),
			total
		};
	}

	$: distribution = getRatingDistribution();
	$: maxCardsPerDay = Math.max(...$weeklyFlashcardStats.map((d) => d.cardsReviewed), 1);
	$: today = getTodayDateString();
</script>

<div class="space-y-6">
	<!-- Success Rate Overview -->
	<div class="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
		<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Árangur</h2>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			<!-- Success Rate Circle -->
			<div class="flex flex-col items-center justify-center">
				<div class="relative w-32 h-32">
					<svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
						<path
							d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
							fill="none"
							stroke="#e5e7eb"
							stroke-width="3"
							class="dark:stroke-gray-700"
						/>
						<path
							d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
							fill="none"
							stroke="#10b981"
							stroke-width="3"
							stroke-dasharray="{$flashcardSuccessRate.rate}, 100"
							stroke-linecap="round"
						/>
					</svg>
					<div class="absolute inset-0 flex flex-col items-center justify-center">
						<span class="text-3xl font-bold text-gray-900 dark:text-gray-100">
							{$flashcardSuccessRate.rate}%
						</span>
						<span class="text-xs text-gray-500 dark:text-gray-400">árangur</span>
					</div>
				</div>
			</div>

			<!-- Stats -->
			<div class="space-y-4">
				<div>
					<p class="text-sm text-gray-500 dark:text-gray-400">Heildar kort</p>
					<p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{$flashcardSuccessRate.total}</p>
				</div>
				<div>
					<p class="text-sm text-gray-500 dark:text-gray-400">Rétt svarað</p>
					<p class="text-2xl font-bold text-green-600 dark:text-green-400">{$flashcardSuccessRate.correct}</p>
				</div>
			</div>

			<!-- Rating Distribution -->
			<div>
				<p class="text-sm text-gray-500 dark:text-gray-400 mb-3">Dreifing einkunna</p>
				{#if distribution.total > 0}
					<div class="space-y-2">
						<div class="flex items-center gap-2">
							<span class="w-14 text-xs text-gray-600 dark:text-gray-400">Aftur</span>
							<div class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
								<div class="h-full bg-red-500" style="width: {distribution.again}%"></div>
							</div>
							<span class="w-8 text-xs text-right text-gray-600 dark:text-gray-400">{distribution.again}%</span>
						</div>
						<div class="flex items-center gap-2">
							<span class="w-14 text-xs text-gray-600 dark:text-gray-400">Erfitt</span>
							<div class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
								<div class="h-full bg-orange-500" style="width: {distribution.hard}%"></div>
							</div>
							<span class="w-8 text-xs text-right text-gray-600 dark:text-gray-400">{distribution.hard}%</span>
						</div>
						<div class="flex items-center gap-2">
							<span class="w-14 text-xs text-gray-600 dark:text-gray-400">Gott</span>
							<div class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
								<div class="h-full bg-green-500" style="width: {distribution.good}%"></div>
							</div>
							<span class="w-8 text-xs text-right text-gray-600 dark:text-gray-400">{distribution.good}%</span>
						</div>
						<div class="flex items-center gap-2">
							<span class="w-14 text-xs text-gray-600 dark:text-gray-400">Auðvelt</span>
							<div class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
								<div class="h-full bg-blue-500" style="width: {distribution.easy}%"></div>
							</div>
							<span class="w-8 text-xs text-right text-gray-600 dark:text-gray-400">{distribution.easy}%</span>
						</div>
					</div>
				{:else}
					<p class="text-sm text-gray-400 dark:text-gray-500 italic">
						Engin æfingarsaga enn
					</p>
				{/if}
			</div>
		</div>
	</div>

	<!-- Weekly Cards Chart -->
	<div class="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
		<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Síðustu 7 dagar</h2>

		<div class="flex items-end justify-between gap-2 h-40">
			{#each $weeklyFlashcardStats as day}
				{@const height = maxCardsPerDay > 0 ? (day.cardsReviewed / maxCardsPerDay) * 100 : 0}
				{@const isToday = day.date === today}
				{@const successRate = day.cardsReviewed > 0 ? Math.round((day.correctCount / day.cardsReviewed) * 100) : 0}
				<div class="flex-1 flex flex-col items-center gap-2">
					<div class="w-full flex flex-col items-center justify-end h-28">
						{#if day.cardsReviewed > 0}
							<span class="text-xs text-gray-500 dark:text-gray-400 mb-1">
								{day.cardsReviewed}
							</span>
						{/if}
						<div
							class="w-full max-w-12 rounded-t-lg transition-all duration-300 {isToday
								? 'bg-green-500'
								: 'bg-gray-300 dark:bg-gray-600'}"
							style="height: {Math.max(height, 4)}%"
							title="{day.cardsReviewed} kort, {successRate}% rétt"
						></div>
					</div>
					<span class="text-xs font-medium {isToday ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}">
						{formatDate(day.date)}
					</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- Daily Success Rate Line Chart (simplified bar representation) -->
	<div class="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
		<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Árangurshlutfall eftir dögum</h2>

		<div class="flex items-end justify-between gap-2 h-40">
			{#each $weeklyFlashcardStats as day}
				{@const successRate = day.cardsReviewed > 0 ? Math.round((day.correctCount / day.cardsReviewed) * 100) : 0}
				{@const isToday = day.date === today}
				<div class="flex-1 flex flex-col items-center gap-2">
					<div class="w-full flex flex-col items-center justify-end h-28">
						{#if day.cardsReviewed > 0}
							<span class="text-xs text-gray-500 dark:text-gray-400 mb-1">
								{successRate}%
							</span>
						{/if}
						<div
							class="w-full max-w-12 rounded-t-lg transition-all duration-300"
							class:bg-green-500={successRate >= 80}
							class:bg-yellow-500={successRate >= 50 && successRate < 80}
							class:bg-red-500={successRate > 0 && successRate < 50}
							class:bg-gray-200={day.cardsReviewed === 0}
							class:dark:bg-gray-700={day.cardsReviewed === 0}
							style="height: {day.cardsReviewed > 0 ? Math.max(successRate, 4) : 4}%"
						></div>
					</div>
					<span class="text-xs font-medium {isToday ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}">
						{formatDate(day.date)}
					</span>
				</div>
			{/each}
		</div>

		<div class="mt-4 flex justify-center gap-6 text-xs">
			<div class="flex items-center gap-1">
				<div class="w-3 h-3 rounded bg-green-500"></div>
				<span class="text-gray-600 dark:text-gray-400">≥80%</span>
			</div>
			<div class="flex items-center gap-1">
				<div class="w-3 h-3 rounded bg-yellow-500"></div>
				<span class="text-gray-600 dark:text-gray-400">50-79%</span>
			</div>
			<div class="flex items-center gap-1">
				<div class="w-3 h-3 rounded bg-red-500"></div>
				<span class="text-gray-600 dark:text-gray-400">&lt;50%</span>
			</div>
		</div>
	</div>
</div>
