<!--
  MarkdownRenderer - Renders markdown content with custom directives and MathJax math
  Supports both markdown and pre-rendered HTML content (from CNXML pipeline)
-->
<script lang="ts">
	import { practiceProblems } from '$lib/actions/practiceProblems';
	import { equations } from '$lib/actions/equations';
	import { figureViewer } from '$lib/actions/figureViewer';
	import { crossReferences } from '$lib/actions/crossReferences';
	import { answerLinks } from '$lib/actions/answerLinks';
	import { bionicReadingAction } from '$lib/actions/bionicReading';
	import Skeleton from './Skeleton.svelte';

	// MathJax SVG is self-contained — no external CSS needed

	export let content: string;
	export let bookSlug: string = '';
	export let chapterSlug: string = '';
	export let sectionSlug: string = '';
	export let chapterNumber: number = 1;
	export let sectionType: string = '';
	export let isHtml: boolean = false; // True for pre-rendered HTML from CNXML pipeline

	let html = '';
	let loading = false;
	let error: string | null = null;
	let lastProcessedContent = '';

	// Process content when it changes (deduplication guard prevents re-processing on hydration)
	$: if (content && content !== lastProcessedContent) {
		processContent(content, isHtml);
	}

	async function processContent(rawContent: string, preRendered: boolean) {
		lastProcessedContent = rawContent;
		error = null;
		try {
			if (preRendered) {
				// HTML content: use directly, no skeleton needed (synchronous)
				html = rawContent;
			} else {
				// Markdown content: process through remark/rehype pipeline
				// Dynamic import prevents mathjax-full (CJS) from loading in the browser bundle
				loading = true;
				const { processMarkdown } = await import('$lib/utils/markdown');
				html = await processMarkdown(rawContent);
			}
		} catch (e) {
			console.error('Content processing error:', e);
			error = 'Villa við úrvinnslu efnis';
		} finally {
			loading = false;
		}
	}
</script>

{#if loading}
	<Skeleton variant="content" />
{:else if error}
	<div class="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 my-4">
		<p class="text-red-600 dark:text-red-400">{error}</p>
	</div>
{:else if html}
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
{:else}
	<Skeleton variant="content" />
{/if}
