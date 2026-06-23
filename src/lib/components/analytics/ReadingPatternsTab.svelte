<!--
  ReadingPatternsTab - Time-of-day reading patterns and consistency
-->
<script lang="ts">
	import { analyticsStore, hourlyReadingDistribution, streakInfo } from '$lib/stores';
	import Icon from '$lib/components/Icon.svelte';

	// Format seconds to readable time
	function formatTime(seconds: number): string {
		if (seconds < 60) {
			return `${seconds} sek`;
		}
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) {
			return `${minutes} mín`;
		}
		const hours = Math.floor(minutes / 60);
		const remainingMinutes = minutes % 60;
		if (remainingMinutes === 0) {
			return `${hours} klst`;
		}
		return `${hours} klst ${remainingMinutes} mín`;
	}

	// Get hour label in 24h format
	function getHourLabel(hour: number): string {
		return hour.toString().padStart(2, '0') + ':00';
	}

	// Get time period name
	function getTimePeriod(hour: number): string {
		if (hour >= 5 && hour < 12) return 'Morgun';
		if (hour >= 12 && hour < 17) return 'Hádegi';
		if (hour >= 17 && hour < 21) return 'Kvöld';
		return 'Nótt';
	}

	// Aggregate by time period
	function getTimeOfDayStats() {
		const periods = {
			morning: { label: 'Morgun (5-12)', totalSeconds: 0, sessionCount: 0, hours: [5, 6, 7, 8, 9, 10, 11] },
			afternoon: { label: 'Hádegi (12-17)', totalSeconds: 0, sessionCount: 0, hours: [12, 13, 14, 15, 16] },
			evening: { label: 'Kvöld (17-21)', totalSeconds: 0, sessionCount: 0, hours: [17, 18, 19, 20] },
			night: { label: 'Nótt (21-5)', totalSeconds: 0, sessionCount: 0, hours: [21, 22, 23, 0, 1, 2, 3, 4] }
		};

		$hourlyReadingDistribution.forEach((data) => {
			if (periods.morning.hours.includes(data.hour)) {
				periods.morning.totalSeconds += data.totalSeconds;
				periods.morning.sessionCount += data.sessionCount;
			} else if (periods.afternoon.hours.includes(data.hour)) {
				periods.afternoon.totalSeconds += data.totalSeconds;
				periods.afternoon.sessionCount += data.sessionCount;
			} else if (periods.evening.hours.includes(data.hour)) {
				periods.evening.totalSeconds += data.totalSeconds;
				periods.evening.sessionCount += data.sessionCount;
			} else {
				periods.night.totalSeconds += data.totalSeconds;
				periods.night.sessionCount += data.sessionCount;
			}
		});

		return Object.values(periods);
	}

	// Find peak reading time
	function getPeakHour(): { hour: number; seconds: number } | null {
		const maxData = $hourlyReadingDistribution.reduce(
			(max, current) => (current.totalSeconds > max.totalSeconds ? current : max),
			{ hour: 0, totalSeconds: 0, sessionCount: 0 }
		);
		return maxData.totalSeconds > 0 ? { hour: maxData.hour, seconds: maxData.totalSeconds } : null;
	}

	// Calculate consistency score based on streak and activity
	function getConsistencyScore(): number {
		const weeklyStats = analyticsStore.getWeeklyStats();
		const streakScore = Math.min($streakInfo.current / 7, 1) * 40; // Up to 40 points for 7-day streak
		const daysActiveScore = (weeklyStats.daysActive / 7) * 40; // Up to 40 points for 7 active days
		const sessionScore = Math.min(weeklyStats.sectionsVisited / 10, 1) * 20; // Up to 20 points for 10+ sections

		return Math.round(streakScore + daysActiveScore + sessionScore);
	}

	let timeOfDayStats = $derived.by(() => getTimeOfDayStats());
	let maxPeriodSeconds = $derived(Math.max(...timeOfDayStats.map((p) => p.totalSeconds), 1));
	let peakHour = $derived.by(() => getPeakHour());
	let consistencyScore = $derived.by(() => getConsistencyScore());
	let maxHourlySeconds = $derived(Math.max(...$hourlyReadingDistribution.map((h) => h.totalSeconds), 1));
</script>

<div class="space-y-6">
	<!-- Overview Cards -->
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- Peak Reading Time -->
		<div class="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
			<div class="flex items-center gap-3">
				<div class="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
					<Icon name="clock" class="text-purple-600 dark:text-purple-400" />
				</div>
				<div>
					<p class="text-xs text-gray-500 dark:text-gray-400">Virkasti tíminn</p>
					{#if peakHour}
						<p class="text-lg font-semibold text-gray-900 dark:text-gray-100">
							{getHourLabel(peakHour.hour)}
						</p>
					{:else}
						<p class="text-lg font-semibold text-gray-400 dark:text-gray-500">-</p>
					{/if}
				</div>
			</div>
		</div>

		<!-- Consistency Score -->
		<div class="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
			<div class="flex items-center gap-3">
				<div class="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
					<Icon name="badge-check" class="text-green-600 dark:text-green-400" />
				</div>
				<div>
					<p class="text-xs text-gray-500 dark:text-gray-400">Samræmi</p>
					<p class="text-lg font-semibold text-gray-900 dark:text-gray-100">
						{consistencyScore}/100
					</p>
				</div>
			</div>
		</div>

		<!-- Current Streak -->
		<div class="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
			<div class="flex items-center gap-3">
				<div class="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
					<Icon name="flame" class="text-amber-600 dark:text-amber-400" />
				</div>
				<div>
					<p class="text-xs text-gray-500 dark:text-gray-400">Núverandi röð</p>
					<p class="text-lg font-semibold text-gray-900 dark:text-gray-100">
						{$streakInfo.current} {$streakInfo.current === 1 ? 'dagur' : 'dagar'}
					</p>
				</div>
			</div>
		</div>

		<!-- Longest Streak -->
		<div class="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
			<div class="flex items-center gap-3">
				<div class="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
					<Icon name="sparkles" class="text-blue-600 dark:text-blue-400" />
				</div>
				<div>
					<p class="text-xs text-gray-500 dark:text-gray-400">Lengsta röð</p>
					<p class="text-lg font-semibold text-gray-900 dark:text-gray-100">
						{$streakInfo.longest} {$streakInfo.longest === 1 ? 'dagur' : 'dagar'}
					</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Time of Day Distribution -->
	<div class="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
		<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Tímasetning lestrar</h2>

		<div class="space-y-4">
			{#each timeOfDayStats as period (period.label)}
				{@const percentage = maxPeriodSeconds > 0 ? (period.totalSeconds / maxPeriodSeconds) * 100 : 0}
				<div>
					<div class="flex justify-between items-center mb-1">
						<span class="text-sm font-medium text-gray-700 dark:text-gray-300">{period.label}</span>
						<span class="text-sm text-gray-500 dark:text-gray-400">
							{formatTime(period.totalSeconds)}
							{#if period.sessionCount > 0}
								<span class="text-xs">({period.sessionCount} lotur)</span>
							{/if}
						</span>
					</div>
					<div class="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
						<div
							class="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
							style="width: {percentage}%"
						></div>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Hourly Heatmap -->
	<div class="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
		<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Lestrarmynstur eftir klukkutíma</h2>

		<div class="grid grid-cols-12 gap-1">
			{#each $hourlyReadingDistribution as data, i (i)}
				{@const intensity = maxHourlySeconds > 0 ? data.totalSeconds / maxHourlySeconds : 0}
				<div
					class="aspect-square rounded-sm flex items-center justify-center text-xs font-medium transition-colors
						{intensity === 0
							? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
							: intensity < 0.25
								? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
								: intensity < 0.5
									? 'bg-blue-300 dark:bg-blue-700 text-blue-900 dark:text-blue-100'
									: intensity < 0.75
										? 'bg-blue-500 dark:bg-blue-500 text-white'
										: 'bg-blue-700 dark:bg-blue-300 text-white dark:text-blue-900'}"
					title="{getHourLabel(data.hour)}: {formatTime(data.totalSeconds)}"
				>
					{data.hour}
				</div>
			{/each}
		</div>

		<div class="mt-4 flex justify-center items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
			<span>Minna</span>
			<div class="flex gap-0.5">
				<div class="w-4 h-4 rounded-sm bg-gray-100 dark:bg-gray-700"></div>
				<div class="w-4 h-4 rounded-sm bg-blue-100 dark:bg-blue-900/30"></div>
				<div class="w-4 h-4 rounded-sm bg-blue-300 dark:bg-blue-700"></div>
				<div class="w-4 h-4 rounded-sm bg-blue-500"></div>
				<div class="w-4 h-4 rounded-sm bg-blue-700 dark:bg-blue-300"></div>
			</div>
			<span>Meira</span>
		</div>
	</div>
</div>
