<!--
  Root Layout - Global styles and theme management
-->
<script lang="ts">
	import { theme } from '$lib/stores';
	import { browser } from '$app/environment';
	import PWAUpdater from '$lib/components/PWAUpdater.svelte';
	import '../app.css';

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
