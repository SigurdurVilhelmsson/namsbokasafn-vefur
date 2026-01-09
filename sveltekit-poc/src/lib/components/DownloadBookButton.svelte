<!--
  DownloadBookButton - Download book for offline reading with progress indicator
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import {
		offline,
		currentDownload,
		downloadBook,
		estimateBookSize,
		formatBytes
	} from '$lib/stores/offline';

	export let bookSlug: string;
	export let bookTitle: string = '';

	let isDownloaded = false;
	let downloadState: { downloaded: boolean; sizeBytes: number; downloadedAt: string | null } | null =
		null;
	let estimatedSize = 0;
	let isEstimating = false;
	let showConfirmDelete = false;

	// Subscribe to offline store
	$: {
		const state = $offline.books[bookSlug];
		isDownloaded = state?.downloaded ?? false;
		downloadState = state ?? null;
	}

	// Get current download progress
	$: progress = $currentDownload;
	$: isDownloading = progress?.bookSlug === bookSlug && progress?.status === 'downloading';
	$: downloadError = progress?.bookSlug === bookSlug ? progress?.error : null;
	$: downloadComplete = progress?.bookSlug === bookSlug && progress?.status === 'complete';

	// Calculate progress percentage
	$: progressPercent =
		isDownloading && progress?.totalFiles
			? Math.round((progress.downloadedFiles / progress.totalFiles) * 100)
			: 0;

	onMount(async () => {
		if (!browser || isDownloaded) return;

		// Estimate size on mount
		isEstimating = true;
		try {
			estimatedSize = await estimateBookSize(bookSlug);
		} finally {
			isEstimating = false;
		}
	});

	async function handleDownload() {
		if (isDownloading || isDownloaded) return;

		const result = await downloadBook(bookSlug);

		if (!result.success) {
			console.error('Download failed:', result.error);
		}
	}

	async function handleDelete() {
		showConfirmDelete = false;
		await offline.removeBook(bookSlug);
	}

	function dismissProgress() {
		offline.clearProgress();
	}
</script>

<div class="download-book">
	{#if isDownloaded && !isDownloading}
		<!-- Downloaded state -->
		<div class="flex items-center gap-3">
			<div
				class="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M5 13l4 4L19 7"
					/>
				</svg>
				<span class="text-sm font-medium">Sótt ({formatBytes(downloadState?.sizeBytes ?? 0)})</span>
			</div>

			{#if !showConfirmDelete}
				<button
					on:click={() => (showConfirmDelete = true)}
					class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
					aria-label="Eyða niðurhali"
					title="Eyða niðurhali"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
						/>
					</svg>
				</button>
			{:else}
				<div class="flex items-center gap-2">
					<span class="text-sm text-gray-600 dark:text-gray-300">Eyða?</span>
					<button
						on:click={handleDelete}
						class="rounded-lg bg-red-100 px-3 py-1 text-sm font-medium text-red-700 transition-colors hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
					>
						Já
					</button>
					<button
						on:click={() => (showConfirmDelete = false)}
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
				<span class="font-medium text-gray-700 dark:text-gray-300">Sæki bók...</span>
				<span class="text-gray-500 dark:text-gray-300">
					{progress?.downloadedFiles ?? 0} / {progress?.totalFiles ?? 0} skrár
				</span>
			</div>

			<!-- Progress bar -->
			<div class="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
				<div
					class="h-full rounded-full bg-blue-600 transition-all duration-300"
					style="width: {progressPercent}%"
				></div>
			</div>

			<div class="mt-1 text-right text-xs text-gray-500 dark:text-gray-300">
				{formatBytes(progress?.downloadedBytes ?? 0)}
			</div>
		</div>
	{:else if downloadComplete}
		<!-- Just completed -->
		<div class="flex items-center gap-3">
			<div
				class="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M5 13l4 4L19 7"
					/>
				</svg>
				<span class="text-sm font-medium">Niðurhal lokið!</span>
			</div>
			<button
				on:click={dismissProgress}
				class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
			>
				Loka
			</button>
		</div>
	{:else if downloadError}
		<!-- Error state -->
		<div class="flex items-center gap-3">
			<div
				class="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-red-700 dark:bg-red-900/30 dark:text-red-400"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<span class="text-sm font-medium">{downloadError}</span>
			</div>
			<button
				on:click={handleDownload}
				class="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
			>
				Reyna aftur
			</button>
			<button
				on:click={dismissProgress}
				class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
			>
				Loka
			</button>
		</div>
	{:else}
		<!-- Not downloaded - show download button -->
		<button
			on:click={handleDownload}
			disabled={isEstimating}
			class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-900"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
				/>
			</svg>
			{#if isEstimating}
				<span>Reikna stærð...</span>
			{:else}
				<span>Sækja fyrir ónettengda notkun</span>
				{#if estimatedSize > 0}
					<span class="text-blue-200">(~{formatBytes(estimatedSize)})</span>
				{/if}
			{/if}
		</button>
	{/if}
</div>
