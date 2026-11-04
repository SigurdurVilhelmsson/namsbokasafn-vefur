<!--
  Analytics Dashboard - Reading statistics and activity tracking
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { PageData } from './$types';
	import type { TableOfContents } from '$lib/types/content';
	import { analyticsStore, streakInfo, todayStats } from '$lib/stores/analytics';
	import { loadTableOfContents, findSectionBySlug } from '$lib/utils/contentLoader';
	import { formatLocalDate, getTodayDateString } from '$lib/utils/storeHelpers';
	import { countsExport, recallSummaryLine, recallTotals } from '$lib/utils/counters';
	import { clearAllStorage, clearExpirationRecords, deleteLocalCaches } from '$lib/utils/storageMigration';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import {
		AnalyticsTabs,
		FlashcardStatsTab,
		ReadingPatternsTab,
		GoalsTab,
		type TabId
	} from '$lib/components/analytics';

	let { data }: { data: PageData } = $props();

	let toc: TableOfContents | null = $state(null);
	let loading = $state(true);
	let activeTab: TabId = $state('yfirlit');

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
				return { icon: '🧠', text: 'Æfði minnisspjöld' };
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
			// Local, like the dailyStats keys; a UTC key showed the wrong day outside UTC (M7)
			const dateStr = formatLocalDate(d);
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

	// The counts-only export (plan step S5.5, D09): 'Flytja út' shows the file first, and
	// 'Sækja skrá' saves exactly the text shown. Nothing is sent; the student decides whether
	// and to whom to send the file. The text is made once, when the dialog opens.
	let countsDialog: HTMLDialogElement | undefined = $state();
	let countsFile = $state('');

	function openCountsExport() {
		countsFile = countsExport($analyticsStore.counters, getTodayDateString());
		countsDialog?.showModal();
	}

	function downloadCounts() {
		const url = URL.createObjectURL(new Blob([countsFile], { type: 'application/json' }));
		const a = document.createElement('a');
		a.href = url;
		a.download = `namsbokasafn-tolur-${getTodayDateString()}.json`;
		a.click();
		URL.revokeObjectURL(url);
		countsDialog?.close();
	}

	// Download the whole statistics file ('Sækja alla tölfræði'; it was 'Flytja út' until S5.5)
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

	// Clear this page's statistics: the analytics store (sessions, reading times, daily stats,
	// streaks, activity, and the goals on the Markmið tab). Learning objectives (/markmid),
	// flashcards, bookmarks, highlights and reading progress stay (plan step S3.2, PED-14).
	// The recall counts go with the statistics; the recalls a reader typed stay (S5.4).
	function handleClearData() {
		const message =
			'Eyða lestrartölfræði, lotum, röð daga, markmiðum og tölum um upprifjun í Námsgreiningu í þessum vafra? Námsmarkmið, minnisspjöld, bókamerki, yfirstrikanir, athugasemdir, það sem þú skrifaðir í upprifjun og framvinda í bókunum haldast. Þetta er ekki hægt að afturkalla.';
		if (confirm(message)) {
			analyticsStore.clearAllData();
		}
	}

	// Erase everything this site keeps in this browser: the service worker's expiry records,
	// downloaded books and the browsing caches first, then every namsbokasafn key, then reload
	// at once, before any store can write its in-memory state back (plan step S3.2, PED-14).
	// The records go before the caches: a page the worker caches in between then leaves at
	// most a record of a deleted entry, never a cached entry that no record would expire.
	async function handleEraseAll() {
		// It names the recall entries (S5.2), which it erases too (S5.4).
		const message =
			'Eyða öllu sem Námsbókasafn geymir í þessum vafra: framvindu, bókamerkjum, yfirstrikunum, athugasemdum, minnisspjöldum, upprifjunum, námsmarkmiðum, æfingadæmum, tölfræði og stillingum? Niðurhalaðar bækur eyðast líka. Þetta er ekki hægt að afturkalla.';
		if (!confirm(message)) return;
		await clearExpirationRecords();
		await deleteLocalCaches();
		clearAllStorage();
		location.reload();
	}

	// Handle tab change
	function handleTabChange(id: TabId) {
		activeTab = id;
	}

	// Reactive data
	// The recall prompt's own counts, added up across books like the cards above (plan step
	// S5.4, PED-17); null until a prompt has been shown
	let recallLine = $derived(recallSummaryLine(recallTotals($analyticsStore.counters)));
	let last7Days = $derived(getLast7Days());
	let maxSeconds = $derived(Math.max(...last7Days.map((d) => d.seconds), 1));
	let topSections = $derived(getTopSections(5));
	// These store methods read state via get() and register no reactive
	// dependencies, so read $analyticsStore to recompute on store changes
	// (new sessions, "Hreinsa gögn", cross-tab updates)
	let recentActivity = $derived.by(() => {
		void $analyticsStore;
		return analyticsStore.getRecentActivity(10);
	});
	let totalReadingTime = $derived.by(() => {
		void $analyticsStore;
		return analyticsStore.getTotalReadingTime();
	});
	let weeklyStats = $derived.by(() => {
		void $analyticsStore;
		return analyticsStore.getWeeklyStats();
	});
</script>

<svelte:head>
	<title>Námsgreining | {data.book?.title ?? 'Bók'}</title>
	<meta property="og:title" content="Námsgreining | {data.book?.title ?? 'Bók'}" />
	<meta name="description" content="Námsgreining og framvinduyfirlit fyrir {data.book?.title ?? 'kennslubók'}" />
	<meta property="og:description" content="Námsgreining og framvinduyfirlit fyrir {data.book?.title ?? 'kennslubók'}" />
	<meta property="og:type" content="website" />
	<link rel="canonical" href="https://namsbokasafn.is/{data.bookSlug}/greining/" />
	<meta property="og:url" content="https://namsbokasafn.is/{data.bookSlug}/greining/" />
</svelte:head>

<div class="max-w-4xl mx-auto">
	<div class="flex flex-wrap items-center justify-between gap-3 mb-6">
		<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
			Námsgreining
		</h1>
		<div class="flex flex-wrap gap-2">
			<!-- 'Flytja út' is the counts-only export (S5.5, D09); the whole statistics file it used to
			     download is 'Sækja alla tölfræði'. -->
			<button
				onclick={openCountsExport}
				class="text-sm px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
			>
				Flytja út
			</button>
			<button
				onclick={handleExport}
				class="text-sm px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
			>
				Sækja alla tölfræði
			</button>
			<!-- red-700, not red-600: 4.5:1 on the light page (the ratchet's old entry for this button). -->
			<button
				onclick={handleClearData}
				class="text-sm px-3 py-1.5 rounded-lg text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
			>
				Hreinsa tölfræði
			</button>
			<button
				onclick={handleEraseAll}
				class="text-sm px-3 py-1.5 rounded-lg text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
			>
				Eyða öllum gögnum á þessu tæki
			</button>
		</div>
	</div>

	<!-- The counts-only export's preview (S5.5, D09). A native modal dialog: focus moves in, and
	     focus returns to 'Flytja út' when it closes. -->
	<!-- It closes itself on Escape: the site's Escape shortcut ('closeModal') calls preventDefault,
	     which stops a native dialog's own Escape. -->
	<dialog
		bind:this={countsDialog}
		onkeydown={(e) => {
			if (e.key === 'Escape') countsDialog?.close();
		}}
		aria-labelledby="counts-export-title"
		class="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-5 text-[var(--text-primary)] backdrop:bg-black/50"
	>
		<h2 id="counts-export-title" class="text-lg font-semibold">Flytja út tölur</h2>
		<p class="mt-2 text-sm text-[var(--text-secondary)]">
			Skráin geymir aðeins tölurnar hér fyrir neðan: hve oft upprifjun birtist í hverri bók og hvernig
			þú brást við henni, og daginn í dag. Ekkert sem þú skrifaðir fer í hana.
		</p>
		<p class="mt-2 text-sm text-[var(--text-secondary)]">
			Ekkert er sent. Þú ræður hvort og hverjum þú sendir skrána, til dæmis kennaranum þínum.
		</p>
		<!-- Focusable, so a keyboard can scroll it -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<pre
			tabindex="0"
			class="mt-3 max-h-64 overflow-auto rounded-lg bg-[var(--bg-secondary)] p-3 text-xs text-[var(--text-primary)]">{countsFile}</pre>
		<div class="mt-4 flex justify-end gap-2">
			<button
				onclick={() => countsDialog?.close()}
				class="rounded-lg px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)]"
			>
				Hætta við
			</button>
			<button
				onclick={downloadCounts}
				class="rounded-lg bg-[var(--accent-color)] px-4 py-2 text-sm font-medium text-[var(--on-accent)] transition-colors hover:bg-[var(--accent-fill-hover)]"
			>
				Sækja skrá
			</button>
		</div>
	</dialog>

	<!-- Tab Navigation -->
	<AnalyticsTabs bind:activeTab onchange={handleTabChange} />

	{#if loading}
		<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
			{#each Array(4) as _, i (i)}
				<Skeleton variant="card" className="p-4" />
			{/each}
		</div>
		<Skeleton variant="card" className="mb-8" />
	{:else}
		<!-- Tab Panels -->
		<div
			id="tabpanel-yfirlit"
			role="tabpanel"
			tabindex="0"
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
								<Icon name="clock" class="text-blue-600 dark:text-blue-400" />
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
								<Icon name="calendar" class="text-green-600 dark:text-green-400" />
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
								<Icon name="chart-column" class="text-purple-600 dark:text-purple-400" />
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
								<Icon name="flame" class="text-amber-600 dark:text-amber-400" />
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

				{#if recallLine}
					<!-- The line itself is in lib/utils/counters.ts (S5.4) -->
					<p class="mb-8 text-sm text-[var(--text-secondary)]" data-recall-summary>{recallLine}</p>
				{/if}

				<!-- Weekly Chart -->
				<div class="mb-8 p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Síðustu 7 dagar</h2>
					<div class="flex items-end justify-between gap-2 h-40">
						{#each last7Days as day (day.date)}
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
											? 'bg-[var(--accent-color)]'
											: 'bg-gray-300 dark:bg-gray-600'}"
										style="height: {Math.max(height, 4)}%"
									></div>
								</div>
								<span class="text-xs font-medium {isToday ? 'text-[var(--accent-strong)]' : 'text-gray-500 dark:text-gray-400'}">
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
							{#each recentActivity as activity (activity.timestamp)}
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
							<p class="text-sm text-gray-500 dark:text-gray-400">Minnisspjöld í dag</p>
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
			tabindex="0"
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
							{#each topSections as section, i (i)}
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
												class="h-full bg-[var(--accent-color)] rounded-full transition-all duration-300"
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
			tabindex="0"
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
			tabindex="0"
			aria-labelledby="tab-markmiđ"
			hidden={activeTab !== 'markmiđ'}
		>
			{#if activeTab === 'markmiđ'}
				<GoalsTab />
			{/if}
		</div>
	{/if}
</div>
