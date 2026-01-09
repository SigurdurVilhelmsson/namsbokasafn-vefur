<!--
  MarkdownRenderer - Renders markdown content with custom directives and KaTeX math
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { processMarkdown } from '$lib/utils/markdown';
	import { practiceProblems } from '$lib/actions/practiceProblems';
	import { equations } from '$lib/actions/equations';
	import { figureViewer } from '$lib/actions/figureViewer';
	import { crossReferences } from '$lib/actions/crossReferences';

	// Import KaTeX CSS
	import 'katex/dist/katex.min.css';

	export let content: string;
	export let bookSlug: string = '';
	export let chapterSlug: string = '';
	export let sectionSlug: string = '';
	export let chapterNumber: number = 1;

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
		<span class="ml-2 text-gray-600 dark:text-gray-300">Hleður efni...</span>
	</div>
{:else if error}
	<div class="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 my-4">
		<p class="text-red-600 dark:text-red-400">{error}</p>
	</div>
{:else}
	<div
		class="reading-content"
		use:practiceProblems
		use:equations
		use:figureViewer
		use:crossReferences={{ bookSlug, chapterSlug, sectionSlug, chapterNumber, content }}
	>
		{@html html}
	</div>
{/if}
