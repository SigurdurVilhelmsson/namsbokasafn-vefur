<!--
  Analytics Dashboard - Reading statistics and activity tracking
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import type { TableOfContents } from '$lib/types/content';
	import { analyticsStore, streakInfo, todayStats } from '$lib/stores/analytics';
	import { loadTableOfContents, findSectionBySlug } from '$lib/utils/contentLoader';
	import { getTodayDateString } from '$lib/utils/storeHelpers';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import {
		AnalyticsTabs,
		FlashcardStatsTab,
		ReadingPatternsTab,
		GoalsTab,
		type TabId
	} from '$lib/components/analytics';

	export let data: PageData;

	let toc: TableOfContents | null = null;
	let loading = true;
	let activeTab: TabId = 'yfirlit';

	onMount(async () => {
		try {
			toc = await loadTableOfContents(data.bookSlug);
		} catch (e) {
			console.error('Failed to load TOC:', e);
		} finally {
			loading = false;
		}
	});

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

	// Format date for display
	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('is-IS', {
			day: 'numeric',
			month: 'short'
		});
	}

	// Format timestamp for activity log
	function formatTimestamp(timestamp: string): string {
		const date = new Date(timestamp);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMins / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffMins < 1) return 'Rétt í þessu';
		if (diffMins < 60) return `${diffMins} mín síðan`;
		if (diffHours < 24) return `${diffHours} klst síðan`;
		if (diffDays === 1) return 'Í gær';
		if (diffDays < 7) return `${diffDays} dögum síðan`;
		return formatDate(timestamp);
	}

	// Get activity icon and text
	function getActivityInfo(type: string, action?: string): { icon: string; text: string } {
		switch (type) {
			case 'reading':
				return { icon: '📖', text: action === 'started' ? 'Byrjaði að lesa' : 'Las kafla' };
			case 'flashcard':
				return { icon: '🧠', text: 'Æfði minniskort' };
			case 'quiz':
				return { icon: '📝', text: 'Tók próf' };
			case 'objective':
				return { icon: '✓', text: action === 'completed' ? 'Kláraði markmið' : 'Skoðaði markmið' };
			case 'annotation':
				return { icon: '✏️', text: 'Bætti við athugasemd' };
			default:
				return { icon: '📊', text: 'Virkni' };
		}
	}

	// Get section title from TOC (supports both v1 slugs and v2 numbers)
	function getSectionTitle(chapterSlug: string, sectionSlug: string): string {
		if (!toc) return `${chapterSlug}/${sectionSlug}`;
		const result = findSectionBySlug(toc, chapterSlug, sectionSlug);
		if (!result) return `${chapterSlug}/${sectionSlug}`;
		return `${result.section.number} ${result.section.title}`;
	}

	// Get last 7 days for chart
	function getLast7Days(): { date: string; label: string; seconds: number }[] {
		const days: { date: string; label: string; seconds: number }[] = [];
		const today = new Date();

		for (let i = 6; i >= 0; i--) {
			const d = new Date(today);
			d.setDate(d.getDate() - i);
			const dateStr = d.toISOString().split('T')[0];
			const stats = $analyticsStore.dailyStats[dateStr];
			days.push({
				date: dateStr,
				label: d.toLocaleDateString('is-IS', { weekday: 'short' }),
				seconds: stats?.totalReadingSeconds || 0
			});
		}
		return days;
	}

	// Get top sections by reading time
	function getTopSections(limit = 5): { key: string; seconds: number; title: string }[] {
		const entries = Object.entries($analyticsStore.sectionReadingTimes)
			.map(([key, data]) => ({
				key,
				seconds: data.totalSeconds,
				title: key
			}))
			.sort((a, b) => b.seconds - a.seconds)
			.slice(0, limit);

		// Resolve titles if TOC is loaded
		if (toc) {
			return entries.map((entry) => {
				const [chapterSlug, sectionSlug] = entry.key.split('/');
				return {
					...entry,
					title: getSectionTitle(chapterSlug, sectionSlug)
				};
			});
		}
		return entries;
	}

	// Export analytics data
	function handleExport() {
		const jsonData = analyticsStore.exportAnalytics();
		const blob = new Blob([jsonData], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `namsbokasafn-analytics-${getTodayDateString()}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	// Clear all data with confirmation
	function handleClearData() {
		if (confirm('Ertu viss um að þú viljir eyða öllum námsupplýsingum? Þetta er ekki hægt að afturkalla.')) {
			analyticsStore.clearAllData();
		}
	}

	// Handle tab change
	function handleTabChange(event: CustomEvent<TabId>) {
		activeTab = event.detail;
	}

	// Reactive data
	$: last7Days = getLast7Days();
	$: maxSeconds = Math.max(...last7Days.map((d) => d.seconds), 1);
	$: topSections = getTopSections(5);
	$: recentActivity = analyticsStore.getRecentActivity(10);
	$: totalReadingTime = analyticsStore.getTotalReadingTime();
	$: weeklyStats = analyticsStore.getWeeklyStats();
</script>

<svelte:head>
	<title>Námsgreining | {data.book?.title ?? 'Bók'}</title>
</svelte:head>

<div class="max-w-4xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
			Námsgreining
		</h1>
		<div class="flex gap-2">
			<button
				on:click={handleExport}
				class="text-sm px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
			>
				Flytja út
			</button>
			<button
				on:click={handleClearData}
				class="text-sm px-3 py-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
			>
				Hreinsa gögn
			</button>
		</div>
	</div>

	<!-- Tab Navigation -->
	<AnalyticsTabs bind:activeTab on:change={handleTabChange} />

	{#if loading}
		<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
			{#each Array(4) as _}
				<Skeleton variant="card" className="p-4" />
			{/each}
		</div>
		<Skeleton variant="card" className="mb-8" />
	{:else}
		<!-- Tab Panels -->
		<div
			id="tabpanel-yfirlit"
			role="tabpanel"
			aria-labelledby="tab-yfirlit"
			hidden={activeTab !== 'yfirlit'}
		>
			{#if activeTab === 'yfirlit'}
				<!-- Overview Cards -->
				<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
					<!-- Total Reading Time -->
					<div class="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
						<div class="flex items-center gap-3">
							<div class="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
								<svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<div>
								<p class="text-xs text-gray-500 dark:text-gray-400">Heildartími</p>
								<p class="text-lg font-semibold text-gray-900 dark:text-gray-100">{formatTime(totalReadingTime)}</p>
							</div>
						</div>
					</div>

					<!-- Today's Reading Time -->
					<div class="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
						<div class="flex items-center gap-3">
							<div class="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
								<svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
								</svg>
							</div>
							<div>
								<p class="text-xs text-gray-500 dark:text-gray-400">Í dag</p>
								<p class="text-lg font-semibold text-gray-900 dark:text-gray-100">{formatTime($todayStats.totalReadingSeconds)}</p>
							</div>
						</div>
					</div>

					<!-- Weekly Average -->
					<div class="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
						<div class="flex items-center gap-3">
							<div class="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
								<svg class="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
								</svg>
							</div>
							<div>
								<p class="text-xs text-gray-500 dark:text-gray-400">Meðaltal/dag</p>
								<p class="text-lg font-semibold text-gray-900 dark:text-gray-100">{formatTime(weeklyStats.averageReadingSeconds)}</p>
							</div>
						</div>
					</div>

					<!-- Current Streak -->
					<div class="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
						<div class="flex items-center gap-3">
							<div class="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
								<svg class="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
								</svg>
							</div>
							<div>
								<p class="text-xs text-gray-500 dark:text-gray-400">Röð daga</p>
								<p class="text-lg font-semibold text-gray-900 dark:text-gray-100">
									{$streakInfo.current} {$streakInfo.current === 1 ? 'dagur' : 'dagar'}
								</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Weekly Chart -->
				<div class="mb-8 p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Síðustu 7 dagar</h2>
					<div class="flex items-end justify-between gap-2 h-40">
						{#each last7Days as day}
							{@const height = maxSeconds > 0 ? (day.seconds / maxSeconds) * 100 : 0}
							{@const isToday = day.date === getTodayDateString()}
							<div class="flex-1 flex flex-col items-center gap-2">
								<div class="w-full flex flex-col items-center justify-end h-28">
									{#if day.seconds > 0}
										<span class="text-xs text-gray-500 dark:text-gray-400 mb-1">
											{formatTime(day.seconds)}
										</span>
									{/if}
									<div
										class="w-full max-w-12 rounded-t-lg transition-all duration-300 {isToday
											? 'bg-blue-500'
											: 'bg-gray-300 dark:bg-gray-600'}"
										style="height: {Math.max(height, 4)}%"
									></div>
								</div>
								<span class="text-xs font-medium {isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}">
									{day.label}
								</span>
							</div>
						{/each}
					</div>
				</div>

				<!-- Recent Activity -->
				<div class="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Nýleg virkni</h2>
					{#if recentActivity.length === 0}
						<p class="text-gray-500 dark:text-gray-400 text-sm py-4">
							Engin virkni skráð enn.
						</p>
					{:else}
						<div class="space-y-3 max-h-80 overflow-y-auto">
							{#each recentActivity as activity}
								{@const info = getActivityInfo(activity.type, activity.details.action)}
								<div class="flex items-start gap-3 py-2">
									<span class="text-lg">{info.icon}</span>
									<div class="flex-1 min-w-0">
										<p class="text-sm text-gray-900 dark:text-gray-100">
											{info.text}
										</p>
										{#if activity.details.chapterSlug && activity.details.sectionSlug}
											<p class="text-xs text-gray-500 dark:text-gray-400 truncate">
												{getSectionTitle(activity.details.chapterSlug, activity.details.sectionSlug)}
											</p>
										{/if}
									</div>
									<span class="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
										{formatTimestamp(activity.timestamp)}
									</span>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Summary Stats -->
				<div class="mt-8 p-6 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Samantekt vikunnar</h2>
					<div class="grid grid-cols-2 lg:grid-cols-4 gap-6">
						<div>
							<p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{weeklyStats.daysActive}</p>
							<p class="text-sm text-gray-500 dark:text-gray-400">Virkir dagar</p>
						</div>
						<div>
							<p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{weeklyStats.sectionsVisited}</p>
							<p class="text-sm text-gray-500 dark:text-gray-400">Kaflar lesið</p>
						</div>
						<div>
							<p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{$todayStats.flashcardsReviewed}</p>
							<p class="text-sm text-gray-500 dark:text-gray-400">Minniskort í dag</p>
						</div>
						<div>
							<p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{$streakInfo.longest}</p>
							<p class="text-sm text-gray-500 dark:text-gray-400">Lengsta röð daga</p>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<div
			id="tabpanel-lestur"
			role="tabpanel"
			aria-labelledby="tab-lestur"
			hidden={activeTab !== 'lestur'}
		>
			{#if activeTab === 'lestur'}
				<ReadingPatternsTab />

				<!-- Top Sections (moved here from overview) -->
				<div class="mt-6 p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Mest lesið</h2>
					{#if topSections.length === 0}
						<p class="text-gray-500 dark:text-gray-400 text-sm py-4">
							Engin lestrarferill enn. Byrjaðu að lesa til að sjá tölfræði!
						</p>
					{:else}
						<div class="space-y-3">
							{#each topSections as section, i}
								{@const percent = maxSeconds > 0 ? (section.seconds / topSections[0].seconds) * 100 : 0}
								<div class="flex items-center gap-3">
									<span class="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
										{i + 1}
									</span>
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
											{section.title}
										</p>
										<div class="mt-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
											<div
												class="h-full bg-blue-500 rounded-full transition-all duration-300"
												style="width: {percent}%"
											></div>
										</div>
									</div>
									<span class="flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">
										{formatTime(section.seconds)}
									</span>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<div
			id="tabpanel-minniskort"
			role="tabpanel"
			aria-labelledby="tab-minniskort"
			hidden={activeTab !== 'minniskort'}
		>
			{#if activeTab === 'minniskort'}
				<FlashcardStatsTab />
			{/if}
		</div>

		<div
			id="tabpanel-markmiđ"
			role="tabpanel"
			aria-labelledby="tab-markmiđ"
			hidden={activeTab !== 'markmiđ'}
		>
			{#if activeTab === 'markmiđ'}
				<GoalsTab />
			{/if}
		</div>
	{/if}
</div>
