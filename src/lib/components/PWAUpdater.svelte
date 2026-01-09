<!--
  PWAUpdater - Handles service worker registration and update prompts

  Features:
  - Registers service worker with periodic update checks
  - Shows "offline ready" notification when app is cached
  - Shows "update available" prompt with update/dismiss options
  - Handles update errors gracefully
-->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	let needRefresh = false;
	let offlineReady = false;
	let updating = false;
	let updateError: string | null = null;
	let intervalId: ReturnType<typeof setInterval> | null = null;
	let updateServiceWorker: (() => Promise<void>) | null = null;

	onMount(async () => {
		if (!browser) return;

		try {
			// Dynamically import the PWA module (only available in browser)
			const { useRegisterSW } = await import('virtual:pwa-register/svelte');

			const {
				needRefresh: needRefreshStore,
				offlineReady: offlineReadyStore,
				updateServiceWorker: updateSW
			} = useRegisterSW({
				immediate: true,
				onRegisteredSW(swUrl, r) {
					console.log('SW Registered:', swUrl);

					// Check for updates periodically (every hour)
					if (r) {
						intervalId = setInterval(
							() => {
								r.update().catch((err) => {
									console.warn('SW update check failed:', err);
								});
							},
							60 * 60 * 1000
						);
					}
				},
				onRegisterError(error) {
					console.error('SW registration error:', error);
				}
			});

			// Store the update function
			updateServiceWorker = updateSW;

			// Subscribe to stores
			needRefreshStore.subscribe((value) => {
				needRefresh = value;
				if (value) {
					// Reset error state when new update is available
					updateError = null;
					updating = false;
				}
			});

			offlineReadyStore.subscribe((value) => {
				offlineReady = value;
			});
		} catch (err) {
			console.warn('PWA registration not available:', err);
		}
	});

	onDestroy(() => {
		if (intervalId) {
			clearInterval(intervalId);
		}
	});

	async function handleUpdate() {
		if (!updateServiceWorker || updating) return;

		updating = true;
		updateError = null;

		try {
			await updateServiceWorker();
			// The page will reload after successful update
		} catch (err) {
			console.error('Update failed:', err);
			updateError = 'Uppfærsla mistókst. Reyndu aftur.';
			updating = false;
		}
	}

	function handleDismissOfflineReady() {
		offlineReady = false;
	}

	function handleDismissUpdate() {
		needRefresh = false;
		updateError = null;
	}

	// Auto-dismiss offline ready notification after 5 seconds
	$: if (offlineReady) {
		const timeout = setTimeout(() => {
			offlineReady = false;
		}, 5000);
		// Cleanup handled by reactive statement re-running
	}
</script>

<!-- Offline Ready Notification -->
{#if offlineReady}
	<div
		class="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-lg bg-emerald-600 p-4 text-white shadow-lg md:left-auto md:right-4"
		role="status"
		aria-live="polite"
		data-testid="pwa-offline-ready"
	>
		<div class="flex items-center justify-between gap-4">
			<div class="flex items-center gap-3">
				<svg class="h-6 w-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M5 13l4 4L19 7"
					/>
				</svg>
				<span class="text-sm font-medium">Forritið er tilbúið til notkunar án nettengingar</span>
			</div>
			<button
				on:click={handleDismissOfflineReady}
				class="rounded-lg p-1 transition-colors hover:bg-emerald-500"
				aria-label="Loka tilkynningu"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>
	</div>
{/if}

<!-- Update Available Prompt -->
{#if needRefresh}
	<div
		class="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-lg bg-blue-600 p-4 text-white shadow-lg md:left-auto md:right-4"
		role="alertdialog"
		aria-labelledby="pwa-update-title"
		aria-describedby="pwa-update-desc"
		data-testid="pwa-update-prompt"
	>
		<div class="mb-3 flex items-center gap-3">
			<svg class="h-6 w-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
				/>
			</svg>
			<span id="pwa-update-title" class="text-sm font-medium">Ný útgáfa er tilbúin!</span>
		</div>

		{#if updateError}
			<p class="mb-3 text-sm text-red-200" role="alert">{updateError}</p>
		{/if}

		<p id="pwa-update-desc" class="sr-only">
			Ný útgáfa af forritinu er tilbúin. Veldu "Uppfæra núna" til að endurhlaða síðuna.
		</p>

		<div class="flex gap-2">
			<button
				on:click={handleUpdate}
				disabled={updating}
				class="flex-1 rounded-lg bg-white px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
				data-testid="pwa-update-button"
			>
				{#if updating}
					<span class="flex items-center justify-center gap-2">
						<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						Uppfæri...
					</span>
				{:else}
					Uppfæra núna
				{/if}
			</button>
			<button
				on:click={handleDismissUpdate}
				disabled={updating}
				class="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-blue-500 disabled:opacity-50"
				data-testid="pwa-dismiss-button"
			>
				Seinna
			</button>
		</div>
	</div>
{/if}
