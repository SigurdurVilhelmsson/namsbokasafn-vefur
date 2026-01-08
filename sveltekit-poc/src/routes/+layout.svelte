<!--
  Root Layout - Global styles and theme management
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { theme } from '$lib/stores';
	import { browser } from '$app/environment';
	import { migrateStorageKeys } from '$lib/utils/storageMigration';
	import PWAUpdater from '$lib/components/PWAUpdater.svelte';
	import '../app.css';

	// Run storage migration on startup
	onMount(() => {
		migrateStorageKeys();
	});

	// Reactive theme class on html element
	$: if (browser) {
		document.documentElement.classList.toggle('dark', $theme === 'dark');
	}
</script>

<svelte:head>
	<meta name="description" content="Námsbókasafn - Opnar kennslubækur á íslensku" />
	<meta name="theme-color" content="#1a7d5c" />
	<link rel="manifest" href="/manifest.webmanifest" />
	<link rel="apple-touch-icon" href="/icons/icon-192.svg" />
</svelte:head>

<slot />

<!-- PWA update prompt -->
<PWAUpdater />
