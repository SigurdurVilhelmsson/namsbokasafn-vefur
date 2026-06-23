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
	import Icon from '$lib/components/Icon.svelte';

	interface Props {
		message: string;
		type?: 'error' | 'warning' | 'offline';
		onRetry?: () => void;
		showBackLink?: boolean;
		backHref?: string;
		backLabel?: string;
	}

	let { message, type = 'error', onRetry, showBackLink = false, backHref = '/', backLabel = 'Til baka' }: Props = $props();

	// Auto-detect offline status
	let isOffline = $derived(browser && !navigator.onLine);
	let effectiveType = $derived(isOffline ? 'offline' : type);

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
			icon: 'text-gray-600 dark:text-gray-300',
			text: 'text-gray-800 dark:text-gray-200',
			button: 'bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white'
		}
	};

	let style = $derived(styles[effectiveType]);

	// Offline message override
	let displayMessage = $derived(isOffline
		? 'Engin nettenging. Athugaðu tenginguna og reyndu aftur.'
		: message);
</script>

<div
	class="rounded-lg border p-4 {style.bg} {style.border}"
	role="alert"
>
	<div class="flex items-start gap-3">
		<!-- Icon -->
		<div class="flex-shrink-0 mt-0.5">
			{#if effectiveType === 'offline'}
				<Icon name="wifi-off" class={style.icon} />
			{:else if effectiveType === 'warning'}
				<Icon name="triangle-alert" class={style.icon} />
			{:else}
				<Icon name="circle-alert" class={style.icon} />
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
							onclick={onRetry}
							class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md {style.button} transition-colors"
						>
							<Icon name="refresh-cw" size="sm" />
							Reyna aftur
						</button>
					{/if}
					{#if showBackLink}
						<a
							href={backHref}
							class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
						>
							<Icon name="arrow-left" size="sm" />
							{backLabel}
						</a>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>
