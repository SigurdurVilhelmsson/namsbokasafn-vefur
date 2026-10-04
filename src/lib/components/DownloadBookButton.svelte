<!--
  DownloadBookButton - Download book for offline reading with progress indicator
-->
<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { browser } from '$app/environment';
	import {
		offline,
		currentDownload,
		downloadBook,
		verifyBook,
		loadOfflineToc,
		formatBytes
	} from '$lib/stores/offline';
	import type { OfflineStatus } from '$lib/utils/offlineSync';

	interface Props {
		bookSlug: string;
	}

	let { bookSlug }: Props = $props();

	let estimatedSize = $state(0);
	let isEstimating = $state(false);
	let showConfirmDelete = $state(false);
	// What is really stored, from the book's offline cache (not just localStorage)
	let status = $state<OfflineStatus>('none');
	let missingFiles = $state(0);
	// A tab no service worker controls yet (first visit) cannot read offline until reloaded
	let uncontrolled = $state(false);

	const pluralRules = new Intl.PluralRules('is');
	/** "1 skrá vantar", "21 skrá vantar", "3 skrár vantar" */
	const filesMissing = (n: number) => `${n} ${pluralRules.select(n) === 'one' ? 'skrá' : 'skrár'} vantar`;

	// Derive from offline store
	let downloadState = $derived($offline.books[bookSlug] ?? null);

	// Get current download progress
	let progress = $derived($currentDownload);
	let isBusy = $derived(progress?.status === 'downloading' || progress?.status === 'estimating');
	let isDownloading = $derived(progress?.bookSlug === bookSlug && isBusy);
	// One download at a time: another book's running download blocks this one
	let otherBookBusy = $derived(!!progress && progress.bookSlug !== bookSlug && isBusy);
	let downloadError = $derived(progress?.bookSlug === bookSlug ? progress?.error : null);
	let downloadComplete = $derived(progress?.bookSlug === bookSlug && progress?.status === 'complete');
	// From the store, so a button remounted mid-download still reports failures
	let failedFileCount = $derived(progress?.bookSlug === bookSlug ? progress.failedFiles : 0);

	// Calculate progress percentage
	let progressPercent = $derived(
		isDownloading && progress?.totalFiles
			? Math.round((progress.downloadedFiles / progress.totalFiles) * 100)
			: 0
	);

	// Overlapping refreshes (a remount just as a download ends): only the latest may write.
	let refreshSeq = 0;

	/** Re-read the served size and version, and what the device holds. */
	async function refresh() {
		const seq = ++refreshSeq;
		isEstimating = true;
		try {
			const toc = await loadOfflineToc(bookSlug);
			const result = await verifyBook(bookSlug, toc?.offline?.version ?? null);
			if (seq !== refreshSeq) return;
			estimatedSize = toc?.offline?.bytes ?? 0;
			status = result.status;
			missingFiles = result.missing;
			uncontrolled = !navigator.serviceWorker?.controller;
		} finally {
			if (seq === refreshSeq) isEstimating = false;
		}
	}

	onMount(() => {
		if (browser) refresh();
	});

	// Re-read what is stored whenever this book's download ends — including one started
	// by an earlier instance of this button (the reader left the page and came back).
	// untrack: refresh() reads $state, which must not become this effect's dependencies.
	$effect(() => {
		const ended =
			progress?.bookSlug === bookSlug &&
			(progress.status === 'complete' || progress.status === 'error');
		if (ended && browser) untrack(() => refresh());
	});

	// ...and when another tab changes this book's record (it finished or removed the
	// download while this tab waited on the lock).
	let lastRecord: string | null | undefined;
	$effect(() => {
		const record = JSON.stringify(downloadState);
		if (lastRecord !== undefined && record !== lastRecord && browser) untrack(() => refresh());
		lastRecord = record;
	});

	async function handleDownload() {
		if (isDownloading) return;

		await downloadBook(bookSlug);
	}

	async function handleDelete() {
		showConfirmDelete = false;
		await offline.removeBook(bookSlug);
		await refresh();
	}

	function dismissProgress() {
		offline.clearProgress();
	}
</script>

<div class="download-book">
	{#if (status === 'complete' || status === 'outdated' || status === 'incomplete') && !isDownloading && !downloadComplete && !downloadError}
		<!-- Something is stored: complete, a newer version is out, or files are missing -->
		<div class="flex flex-wrap items-center gap-3">
			{#if status === 'complete'}
				<div
					class="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
				>
					<Icon name="check" />
					<span class="text-sm font-medium">Sótt ({formatBytes(downloadState?.sizeBytes ?? 0)})</span>
				</div>
			{:else}
				<div
					class="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
				>
					<Icon name="triangle-alert" />
					<span class="text-sm font-medium">
						{#if status === 'outdated'}
							Ný útgáfa bókarinnar er komin.
						{:else}
							Niðurhal ófullgert{missingFiles > 0 ? ` — ${filesMissing(missingFiles)}` : ''}.
						{/if}
					</span>
				</div>
				<button
					onclick={handleDownload}
					disabled={otherBookBusy}
					class="inline-flex items-center gap-2 rounded-lg bg-[var(--accent-color)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<Icon name={status === 'outdated' ? 'refresh-cw' : 'download'} />
					<span>{status === 'outdated' ? 'Uppfæra' : 'Ljúka niðurhali'}</span>
				</button>
			{/if}
			{#if uncontrolled}
				<p class="w-full text-sm text-amber-700 dark:text-amber-400">
					Opnaðu síðuna aftur einu sinni svo bókin opnist án nettengingar.
				</p>
			{/if}

			{#if !showConfirmDelete}
				<button
					onclick={() => (showConfirmDelete = true)}
					class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
					aria-label="Eyða niðurhali"
					title="Eyða niðurhali"
				>
					<Icon name="trash-2" />
				</button>
			{:else}
				<div class="flex items-center gap-2">
					<span class="text-sm text-gray-600 dark:text-gray-300">Eyða?</span>
					<button
						onclick={handleDelete}
						class="rounded-lg bg-red-100 px-3 py-1 text-sm font-medium text-red-700 transition-colors hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
					>
						Já
					</button>
					<button
						onclick={() => (showConfirmDelete = false)}
						class="rounded-lg bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
					>
						Nei
					</button>
				</div>
			{/if}
		</div>
	{:else if isDownloading}
		<!-- Downloading state with progress -->
		<div class="w-full max-w-xs">
			<div class="mb-2 flex items-center justify-between text-sm">
				<span class="font-medium text-gray-700 dark:text-gray-300">
					{progress?.status === 'estimating' ? 'Undirbý niðurhal...' : 'Sæki bók...'}
				</span>
				{#if progress?.status === 'downloading'}
					<span class="text-gray-500 dark:text-gray-300">
						{progress.downloadedFiles} / {progress.totalFiles} skrár
					</span>
				{/if}
			</div>

			<!-- Progress bar -->
			<div class="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
				<div
					class="h-full rounded-full bg-[var(--accent-color)] transition-all duration-300"
					style="width: {progressPercent}%"
				></div>
			</div>

			<div class="mt-1 text-right text-xs text-gray-500 dark:text-gray-300">
				{formatBytes(progress?.downloadedBytes ?? 0)}{#if progress?.totalBytes}
					/ {formatBytes(progress.totalBytes)}{/if}
			</div>
		</div>
	{:else if downloadComplete}
		<!-- Just completed -->
		<div class="flex flex-wrap items-center gap-3">
			<div
				class="flex items-center gap-2 rounded-lg px-4 py-2 {failedFileCount > 0
					? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
					: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}"
			>
				{#if failedFileCount > 0}<Icon name="triangle-alert" />{:else}<Icon name="check" />{/if}
				<span class="text-sm font-medium">
					{#if failedFileCount > 0}
						Niðurhal lokið ({filesMissing(failedFileCount)})
					{:else}
						Niðurhal lokið!
					{/if}
				</span>
			</div>
			<button
				onclick={dismissProgress}
				class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
			>
				Loka
			</button>
			{#if uncontrolled}
				<p class="w-full text-sm text-amber-700 dark:text-amber-400">
					Opnaðu síðuna aftur einu sinni svo bókin opnist án nettengingar.
				</p>
			{/if}
		</div>
	{:else if downloadError}
		<!-- Error state -->
		<div class="flex items-center gap-3">
			<div
				class="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-red-700 dark:bg-red-900/30 dark:text-red-400"
			>
				<Icon name="circle-alert" />
				<span class="text-sm font-medium">{downloadError}</span>
			</div>
			<button
				onclick={handleDownload}
				class="text-sm font-medium text-[var(--accent-color)] hover:text-[var(--accent-hover)]"
			>
				Reyna aftur
			</button>
			<button
				onclick={dismissProgress}
				class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
			>
				Loka
			</button>
		</div>
	{:else}
		<!-- Not downloaded - show download button -->
		<button
			onclick={handleDownload}
			disabled={isEstimating || otherBookBusy}
			class="inline-flex items-center gap-2 rounded-lg bg-[var(--accent-color)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
		>
			<Icon name="download" />
			{#if isEstimating}
				<span>Reikna stærð...</span>
			{:else}
				<span>{status === 'legacy' ? 'Sækja aftur' : 'Sækja fyrir ónettengda notkun'}</span>
				{#if estimatedSize > 0}
					<span class="opacity-80">(~{formatBytes(estimatedSize)})</span>
				{/if}
			{/if}
		</button>
		{#if otherBookBusy}
			<p class="mt-2 text-sm text-gray-600 dark:text-gray-300">Önnur bók er í niðurhali.</p>
		{/if}
		{#if status === 'legacy'}
			<!-- The pre-2026-10 download kept only some of the figures while saying "Sótt" -->
			<p class="mt-2 text-sm text-amber-700 dark:text-amber-400">
				Fyrra niðurhal var ófullkomið. Sæktu bókina aftur til að lesa hana alla án nettengingar.
			</p>
		{/if}
	{/if}
</div>
