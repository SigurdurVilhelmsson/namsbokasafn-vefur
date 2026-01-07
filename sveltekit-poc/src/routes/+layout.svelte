<!--
  Root Layout - Global styles and theme management
-->
<script lang="ts">
	import { theme } from '$lib/stores';
	import { browser } from '$app/environment';
	import '../app.css';

	// Reactive theme class on html element
	$: if (browser) {
		document.documentElement.classList.toggle('dark', $theme === 'dark');
	}
</script>

<svelte:head>
	<meta name="description" content="Námsbókasafn - Opnar kennslubækur á íslensku" />
</svelte:head>

<slot />
