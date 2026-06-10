<!--
  ContentRenderer - Renders pre-rendered HTML content from the CNXML pipeline
-->
<script lang="ts">
	import { practiceProblems } from '$lib/actions/practiceProblems';
	import { equations } from '$lib/actions/equations';
	import { figureViewer } from '$lib/actions/figureViewer';
	import { crossReferences } from '$lib/actions/crossReferences';
	import { answerLinks } from '$lib/actions/answerLinks';
	import { bionicReadingAction } from '$lib/actions/bionicReading';
	import { glossaryTerms } from '$lib/actions/glossaryTerms';
	import { lazyImages } from '$lib/actions/lazyImages';
	import Skeleton from './Skeleton.svelte';

	interface Props {
		content: string;
		bookSlug?: string;
		chapterSlug?: string;
		sectionSlug?: string;
		chapterNumber?: number;
		sectionType?: string;
	}

	let { content, bookSlug = '', chapterSlug = '', sectionSlug = '', chapterNumber = 1, sectionType = '' }: Props = $props();

	let html = $state('');
	let error: string | null = $state(null);
	let lastProcessedContent = '';

	// Update html when content changes (deduplication guard prevents re-processing on hydration)
	$effect(() => {
		if (content && content !== lastProcessedContent) {
			lastProcessedContent = content;
			error = null;
			html = content;
		}
	});
</script>

{#if error}
	<div class="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 my-4">
		<p class="text-red-600 dark:text-red-400">{error}</p>
	</div>
{:else if html}
	<!-- bionicReadingAction wraps/unwraps <b> elements in place (no innerHTML
		 snapshot), so it cannot orphan listeners attached by the other actions
		 and the action order carries no constraints. -->
	<div
		class="reading-content"
		use:practiceProblems={{ bookSlug, chapterSlug, sectionSlug }}
		use:equations
		use:figureViewer
		use:crossReferences={{ bookSlug, chapterSlug, sectionSlug, chapterNumber, content }}
		use:answerLinks={{ bookSlug, chapterSlug, sectionSlug, sectionType, chapterNumber }}
		use:glossaryTerms={{ bookSlug }}
		use:bionicReadingAction={content}
		use:lazyImages
	>
		<!-- SECURITY: This HTML is trusted output from the CNXML rendering pipeline in
			 the namsbokasafn-efni sister repo. It is NOT user-generated content.
			 If the content source were ever compromised, this would be an XSS vector.
			 Do not use {@html} with untrusted or user-supplied content. -->
		{@html html}
	</div>
{:else}
	<Skeleton variant="content" />
{/if}
