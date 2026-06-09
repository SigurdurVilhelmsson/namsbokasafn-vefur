<!--
  Print view of the appendices — cover page + every appendix article.
  Loaded by Playwright at PDF generation time, appended to the full-book PDF.
-->
<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.bookTitle} — Viðaukar</title>
</svelte:head>

<!-- Cover page -->
<section class="print-cover">
	<p class="cover-eyebrow">{data.bookTitle}</p>
	<h1 class="cover-title">Viðaukar</h1>
	<p class="cover-book-title">{data.bookSubtitle}</p>
	<p class="cover-meta">namsbokasafn.is</p>
</section>

<!--
  block.content is HTML extracted from files in static/content/ — committed
  to the repo and reviewed via PR, never user input. {@html} renders only
  that trusted source whether the page is served prerendered (URLs in
  entries()) or via the adapter-static SPA fallback (load() 404s anything
  not in entries()). Trust comes from the content source, not the runtime.
-->
{#each data.blocks as block (block.letter)}
	<div class="print-appendix">
		<p class="appendix-eyebrow">Viðauki {block.letter}</p>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html block.content}
	</div>
{/each}
