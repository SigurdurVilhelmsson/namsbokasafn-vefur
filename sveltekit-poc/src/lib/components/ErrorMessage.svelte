<!--
  ErrorMessage - Reusable inline error display component

  Usage:
    <ErrorMessage
      message="Gat ekki hlaðið efni"
      type="error"
      onRetry={() => loadContent()}
    />
-->
<script lang="ts">
	import { browser } from '$app/environment';

	export let message: string;
	export let type: 'error' | 'warning' | 'offline' = 'error';
	export let onRetry: (() => void) | undefined = undefined;
	export let showBackLink = false;
	export let backHref = '/';
	export let backLabel = 'Til baka';

	// Auto-detect offline status
	$: isOffline = browser && !navigator.onLine;
	$: effectiveType = isOffline ? 'offline' : type;

	// Style mappings
	const styles = {
		error: {
			bg: 'bg-red-50 dark:bg-red-900/20',
			border: 'border-red-200 dark:border-red-800',
			icon: 'text-red-600 dark:text-red-400',
			text: 'text-red-800 dark:text-red-200',
			button: 'bg-red-600 hover:bg-red-700 text-white'
		},
		warning: {
			bg: 'bg-yellow-50 dark:bg-yellow-900/20',
			border: 'border-yellow-200 dark:border-yellow-800',
			icon: 'text-yellow-600 dark:text-yellow-400',
			text: 'text-yellow-800 dark:text-yellow-200',
			button: 'bg-yellow-600 hover:bg-yellow-700 text-white'
		},
		offline: {
			bg: 'bg-gray-50 dark:bg-gray-800',
			border: 'border-gray-200 dark:border-gray-700',
			icon: 'text-gray-600 dark:text-gray-400',
			text: 'text-gray-800 dark:text-gray-200',
			button: 'bg-blue-600 hover:bg-blue-700 text-white'
		}
	};

	$: style = styles[effectiveType];

	// Offline message override
	$: displayMessage = isOffline
		? 'Engin nettenging. Athugaðu tenginguna og reyndu aftur.'
		: message;
</script>

<div
	class="rounded-lg border p-4 {style.bg} {style.border}"
	role="alert"
>
	<div class="flex items-start gap-3">
		<!-- Icon -->
		<div class="flex-shrink-0 mt-0.5">
			{#if effectiveType === 'offline'}
				<svg class="w-5 h-5 {style.icon}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
				</svg>
			{:else if effectiveType === 'warning'}
				<svg class="w-5 h-5 {style.icon}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
			{:else}
				<svg class="w-5 h-5 {style.icon}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			{/if}
		</div>

		<!-- Content -->
		<div class="flex-1">
			<p class="{style.text}">
				{displayMessage}
			</p>

			<!-- Actions -->
			{#if onRetry || showBackLink}
				<div class="mt-3 flex flex-wrap gap-2">
					{#if onRetry}
						<button
							on:click={onRetry}
							class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md {style.button} transition-colors"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
							Reyna aftur
						</button>
					{/if}
					{#if showBackLink}
						<a
							href={backHref}
							class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
							</svg>
							{backLabel}
						</a>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>
