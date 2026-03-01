<!--
  Error Page - Displays user-friendly error messages with offline support
-->
<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { offline } from '$lib/stores/offline';

	// Check if we're offline
	let isOffline = false;
	let isBookDownloaded = false;
	let bookSlug: string | null = null;

	// Extract book slug from URL if we're on a book page
	$: {
		const pathParts = $page.url.pathname.split('/').filter(Boolean);
		if (pathParts.length > 0 && pathParts[0] !== 'demo') {
			bookSlug = pathParts[0];
		}
	}

	onMount(() => {
		isOffline = !navigator.onLine;

		// Listen for online/offline changes
		const handleOnline = () => (isOffline = false);
		const handleOffline = () => (isOffline = true);
		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	});

	// Check if book is downloaded
	$: if (bookSlug && browser) {
		isBookDownloaded = offline.isDownloaded(bookSlug);
	}

	// Determine error type and message
	$: errorMessage = $page.error?.message || '';
	$: is404 = $page.status === 404;
	$: isOfflineError = $page.status === 503 || (isOffline && errorMessage.includes('nettengingar'));
	$: isServerError = $page.status && $page.status >= 500 && !isOfflineError;

	function retry() {
		if (browser) {
			window.location.reload();
		}
	}

	function goBack() {
		if (browser) {
			window.history.back();
		}
	}
</script>

<svelte:head>
	<title>{is404 ? 'Síða fannst ekki' : isOfflineError ? 'Án nettengingar' : 'Villa'} | Námsbókasafn</title>
</svelte:head>

<div class="min-h-[60vh] flex items-center justify-center px-4">
	<div class="max-w-md w-full text-center">
		<!-- Icon -->
		<div class="mb-6">
			{#if isOfflineError || isOffline}
				<div class="mx-auto w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
					<svg class="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
					</svg>
				</div>
			{:else if is404}
				<div class="mx-auto w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
					<svg class="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
			{:else}
				<div class="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
					<svg class="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
				</div>
			{/if}
		</div>

		<!-- Title -->
		<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
			{#if isOfflineError || isOffline}
				Engin nettenging
			{:else if is404}
				Síða fannst ekki
			{:else if isServerError}
				Þjónustuvilla
			{:else}
				Villa kom upp
			{/if}
		</h1>

		<!-- Description -->
		<p class="text-gray-600 dark:text-gray-300 mb-4">
			{#if isOfflineError || isOffline}
				{#if bookSlug && !isBookDownloaded}
					Þú ert án nettengingar og þessi bók hefur ekki verið sótt fyrir ónettengdan lestur.
				{:else if bookSlug && isBookDownloaded}
					Þú ert án nettengingar. Þetta efni er ekki í skyndiminni þínu.
				{:else}
					Þú virðist vera án nettengingar. Athugaðu tenginguna og reyndu aftur.
				{/if}
			{:else if is404}
				Efnið sem þú leitar að finnst ekki. Það gæti hafa verið fært eða eytt.
			{:else if isServerError}
				Eitthvað fór úrskeiðis á þjóninum. Vinsamlegast reyndu aftur síðar.
			{:else if errorMessage}
				{errorMessage}
			{:else}
				Óþekkt villa kom upp.
			{/if}
		</p>

		<!-- Offline help box -->
		{#if (isOfflineError || isOffline) && bookSlug && !isBookDownloaded}
			<div class="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
				<div class="flex items-start gap-3 text-left">
					<svg class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<div>
						<p class="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
							Viltu lesa án nettengingar?
						</p>
						<p class="text-sm text-blue-700 dark:text-blue-300">
							Farðu á forsíðu bókarinnar og ýttu á "Sækja bók" til að geta lesið án nettengingar.
						</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Actions -->
		<div class="flex flex-col sm:flex-row gap-3 justify-center">
			{#if (isOfflineError || isOffline) && bookSlug && !isBookDownloaded}
				<a
					href="/{bookSlug}"
					class="btn-accent"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
					</svg>
					Fara í bók
				</a>
			{:else if isOffline || isServerError}
				<button
					on:click={retry}
					class="btn-accent"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
					Reyna aftur
				</button>
			{/if}

			<button
				on:click={goBack}
				class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
				</svg>
				Til baka
			</button>

			<a
				href="/"
				class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
				</svg>
				Forsíða
			</a>
		</div>

		<!-- Connection status indicator -->
		{#if browser}
			<div class="mt-6 flex items-center justify-center gap-2 text-sm">
				<span class="relative flex h-2 w-2">
					{#if isOffline}
						<span class="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
					{:else}
						<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
						<span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
					{/if}
				</span>
				<span class="text-gray-500 dark:text-gray-300">
					{isOffline ? 'Án tengingar' : 'Tengdur'}
				</span>
			</div>
		{/if}

		<!-- Status code (for debugging in non-offline cases) -->
		{#if $page.status && $page.status !== 404 && !isOfflineError}
			<p class="mt-4 text-sm text-gray-400 dark:text-gray-500">
				Villukóði: {$page.status}
			</p>
		{/if}
	</div>
</div>
