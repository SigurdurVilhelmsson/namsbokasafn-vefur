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

	export let content: string;
	export let bookSlug: string = '';
	export let chapterSlug: string = '';
	export let sectionSlug: string = '';
	export let chapterNumber: number = 1;
	export let sectionType: string = '';

	let html = '';
	let error: string | null = null;
	let lastProcessedContent = '';

	// Update html when content changes (deduplication guard prevents re-processing on hydration)
	$: if (content && content !== lastProcessedContent) {
		lastProcessedContent = content;
		error = null;
		html = content;
	}
</script>

{#if error}
	<div class="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 my-4">
		<p class="text-red-600 dark:text-red-400">{error}</p>
	</div>
{:else if html}
	<!-- ACTION ORDERING CONSTRAINT: bionicReadingAction must be the last action that
		 modifies innerHTML. It stores a snapshot of innerHTML on activation and restores
		 it on deactivation. Any action listed after it that adds DOM event listeners
		 (e.g., practiceProblems, glossaryTerms) would have those listeners orphaned when
		 bionic reading restores the original HTML. Actions listed before it are safe
		 because their listeners are already attached before the snapshot is taken.
		 lazyImages is safe after it because it only observes existing elements. -->
	<div
		class="reading-content"
		use:practiceProblems
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
