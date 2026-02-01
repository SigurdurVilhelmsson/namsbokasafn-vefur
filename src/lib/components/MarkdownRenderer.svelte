<!--
  MarkdownRenderer - Renders markdown content with custom directives and KaTeX math
  Supports both markdown and pre-rendered HTML content (from CNXML pipeline)
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { processMarkdown } from '$lib/utils/markdown';
	import { practiceProblems } from '$lib/actions/practiceProblems';
	import { equations } from '$lib/actions/equations';
	import { figureViewer } from '$lib/actions/figureViewer';
	import { crossReferences } from '$lib/actions/crossReferences';
	import { answerLinks } from '$lib/actions/answerLinks';
	import { bionicReadingAction } from '$lib/actions/bionicReading';
	import Skeleton from './Skeleton.svelte';

	// Import KaTeX CSS
	import 'katex/dist/katex.min.css';

	export let content: string;
	export let bookSlug: string = '';
	export let chapterSlug: string = '';
	export let sectionSlug: string = '';
	export let chapterNumber: number = 1;
	export let sectionType: string = '';
	export let isHtml: boolean = false; // True for pre-rendered HTML from CNXML pipeline

	let html = '';
	let loading = true;
	let error: string | null = null;

	// Process content when it changes
	$: if (content) {
		processContent(content, isHtml);
	}

	async function processContent(rawContent: string, preRendered: boolean) {
		loading = true;
		error = null;
		try {
			if (preRendered) {
				// HTML content: use directly, skip markdown processing
				html = rawContent;
			} else {
				// Markdown content: process through remark/rehype pipeline
				html = await processMarkdown(rawContent);
			}
		} catch (e) {
			console.error('Content processing error:', e);
			error = 'Villa við úrvinnslu efnis';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		if (content) {
			processContent(content, isHtml);
		}
	});
</script>

{#if loading}
	<Skeleton variant="content" />
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
		use:answerLinks={{ bookSlug, chapterSlug, sectionSlug, sectionType, chapterNumber }}
		use:bionicReadingAction
	>
		{@html html}
	</div>
{/if}
