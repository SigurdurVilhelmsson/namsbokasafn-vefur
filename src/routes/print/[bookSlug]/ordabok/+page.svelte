<!--
  Back-of-book glossary for the full-book PDF. Rendered once by generate-pdfs.js
  and merged after the appendices. Each term carries a stable `gloss-N` id so
  content `<dfn class="term">` occurrences can later link to their definition.
-->
<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.bookTitle} — Orðaskrá</title>
</svelte:head>

<!-- Divider cover, matching the appendix opener. -->
<section class="print-cover print-backmatter-cover">
	<p class="cover-eyebrow">{data.bookTitle}</p>
	<h1 class="cover-title">Orðaskrá</h1>
	<p class="cover-book-title">{data.bookSubtitle}</p>
</section>

<div class="print-glossary">
	<dl>
		{#each data.terms as t, i (i)}
			<div class="gloss-entry">
				<dt id="gloss-{i}">
					{t.term}{#if t.english}<span class="gloss-en"> · {t.english}</span>{/if}
				</dt>
				<dd>{t.definition}</dd>
			</div>
		{/each}
	</dl>
</div>

<!-- Invisible self-target links: Chromium only creates a named destination for
     an element that is the target of an in-document link. These give every
     gloss-N entry a destination so the chapter `<dfn>` term-links resolve to it
     after the merge (harvested by generate-pdfs.js). -->
<div class="toc-anchor-targets" aria-hidden="true">
	{#each data.terms as _t, i (i)}
		<a href="#gloss-{i}">·</a>
	{/each}
</div>
