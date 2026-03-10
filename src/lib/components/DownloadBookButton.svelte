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

	interface Props {
		bookSlug: string;
	}

	let { bookSlug }: Props = $props();

	let estimatedSize = $state(0);
	let isEstimating = $state(false);
	let showConfirmDelete = $state(false);
	let failedFileCount = $state(0);

	// Derive from offline store
	let downloadState = $derived($offline.books[bookSlug] ?? null);
	let isDownloaded = $derived(downloadState?.downloaded ?? false);

	// Get current download progress
	let progress = $derived($currentDownload);
	let isDownloading = $derived(progress?.bookSlug === bookSlug && progress?.status === 'downloading');
	let downloadError = $derived(progress?.bookSlug === bookSlug ? progress?.error : null);
	let downloadComplete = $derived(progress?.bookSlug === bookSlug && progress?.status === 'complete');

	// Calculate progress percentage
	let progressPercent = $derived(
		isDownloading && progress?.totalFiles
			? Math.round((progress.downloadedFiles / progress.totalFiles) * 100)
			: 0
	);

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

		failedFileCount = 0;
		const result = await downloadBook(bookSlug);

		if (result.failedCount) {
			failedFileCount = result.failedCount;
		}

		if (!result.success) {
			console.error('Download failed:', result.error);
		}
	}

	async function handleDelete() {
		showConfirmDelete = false;
		await offline.removeBook(bookSlug);
	}

	function dismissProgress() {
		failedFileCount = 0;
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
					onclick={() => (showConfirmDelete = true)}
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
				<span class="font-medium text-gray-700 dark:text-gray-300">Sæki bók...</span>
				<span class="text-gray-500 dark:text-gray-300">
					{progress?.downloadedFiles ?? 0} / {progress?.totalFiles ?? 0} skrár
				</span>
			</div>

			<!-- Progress bar -->
			<div class="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
				<div
					class="h-full rounded-full bg-[var(--accent-color)] transition-all duration-300"
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
				class="flex items-center gap-2 rounded-lg px-4 py-2 {failedFileCount > 0
					? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
					: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					{#if failedFileCount > 0}
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					{:else}
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M5 13l4 4L19 7"
						/>
					{/if}
				</svg>
				<span class="text-sm font-medium">
					{#if failedFileCount > 0}
						Niðurhal lokið ({failedFileCount} {failedFileCount === 1 ? 'skrá vantar' : 'skrár vantaðar'})
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
			disabled={isEstimating}
			class="inline-flex items-center gap-2 rounded-lg bg-[var(--accent-color)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
					<span class="opacity-80">(~{formatBytes(estimatedSize)})</span>
				{/if}
			{/if}
		</button>
	{/if}
</div>
