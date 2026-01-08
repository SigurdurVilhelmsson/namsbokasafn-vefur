<!--
  PWAUpdater - Handles service worker registration and update prompts
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let needRefresh = false;
	let offlineReady = false;
	let registration: ServiceWorkerRegistration | undefined;

	onMount(async () => {
		if (!browser) return;

		// Dynamically import the PWA module (only available in browser)
		const { useRegisterSW } = await import('virtual:pwa-register/svelte');

		const {
			needRefresh: needRefreshStore,
			offlineReady: offlineReadyStore,
			updateServiceWorker
		} = useRegisterSW({
			immediate: true,
			onRegisteredSW(swUrl, r) {
				registration = r;
				console.log('SW Registered:', swUrl);

				// Check for updates periodically (every hour)
				if (r) {
					setInterval(
						() => {
							r.update();
						},
						60 * 60 * 1000
					);
				}
			},
			onRegisterError(error) {
				console.error('SW registration error:', error);
			}
		});

		// Subscribe to stores
		needRefreshStore.subscribe((value) => {
			needRefresh = value;
		});

		offlineReadyStore.subscribe((value) => {
			offlineReady = value;
		});

		// Make updateServiceWorker available
		(window as unknown as { updateSW: () => Promise<void> }).updateSW = updateServiceWorker;
	});

	function handleUpdate() {
		const updateSW = (window as unknown as { updateSW: () => Promise<void> }).updateSW;
		if (updateSW) {
			updateSW();
		}
	}

	function handleDismiss() {
		offlineReady = false;
	}
</script>

{#if offlineReady}
	<div
		class="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-lg bg-emerald-600 p-4 text-white shadow-lg md:left-auto md:right-4"
		role="alert"
	>
		<div class="flex items-center justify-between gap-4">
			<div class="flex items-center gap-3">
				<svg class="h-6 w-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
				on:click={handleDismiss}
				class="rounded-lg p-1 transition-colors hover:bg-emerald-500"
				aria-label="Loka"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

{#if needRefresh}
	<div
		class="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-lg bg-blue-600 p-4 text-white shadow-lg md:left-auto md:right-4"
		role="alert"
	>
		<div class="mb-3 flex items-center gap-3">
			<svg class="h-6 w-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
				/>
			</svg>
			<span class="text-sm font-medium">Ný útgáfa er tilbúin!</span>
		</div>
		<div class="flex gap-2">
			<button
				on:click={handleUpdate}
				class="flex-1 rounded-lg bg-white px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
			>
				Uppfæra núna
			</button>
			<button
				on:click={() => (needRefresh = false)}
				class="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-blue-500"
			>
				Seinna
			</button>
		</div>
	</div>
{/if}
