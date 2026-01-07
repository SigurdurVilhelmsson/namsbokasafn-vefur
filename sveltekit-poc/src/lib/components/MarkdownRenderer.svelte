<!--
  MarkdownRenderer - Renders markdown content with custom directives and KaTeX math
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { processMarkdown } from '$lib/utils/markdown';

	// Import KaTeX CSS
	import 'katex/dist/katex.min.css';

	// Import mhchem for chemical notation
	import 'katex/dist/contrib/mhchem.js';

	export let content: string;

	let html = '';
	let loading = true;
	let error: string | null = null;

	// Process markdown when content changes
	$: if (content) {
		processContent(content);
	}

	async function processContent(markdown: string) {
		loading = true;
		error = null;
		try {
			html = await processMarkdown(markdown);
		} catch (e) {
			console.error('Markdown processing error:', e);
			error = 'Villa við úrvinnslu efnis';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		if (content) {
			processContent(content);
		}
	});
</script>

{#if loading}
	<div class="flex items-center justify-center py-8">
		<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
		<span class="ml-2 text-gray-600 dark:text-gray-400">Hleður efni...</span>
	</div>
{:else if error}
	<div class="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 my-4">
		<p class="text-red-600 dark:text-red-400">{error}</p>
	</div>
{:else}
	<div class="reading-content">
		{@html html}
	</div>
{/if}
