<!--
  Print layout — strips all interactive chrome and applies print.css for
  PDF rendering. The /print/* routes exist solely so Playwright can print
  them to file via page.pdf(); they are excluded from sitemap and robots.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { browser } from '$app/environment';

	let { children }: { children: Snippet } = $props();

	// Force light theme on the document. The root layout's $effect may have
	// applied dark mode based on user preference; override it for print
	// regardless. CSS in print.css also enforces white background as a
	// belt-and-braces safety.
	$effect(() => {
		if (browser) {
			document.documentElement.classList.remove('dark');
			document.documentElement.setAttribute('data-theme', 'light');
		}
	});
</script>

<svelte:head>
	<link rel="stylesheet" href="/styles/print.css" />
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="print-document">
	{@render children()}
</div>

<style>
	/* Strip the contributions of any ancestor layouts visually — print
	   routes are content-only. */
	:global(.print-document) {
		min-height: 100vh;
		background: #ffffff;
		color: #1a1a1a;
		padding: 0;
		margin: 0;
	}
</style>
