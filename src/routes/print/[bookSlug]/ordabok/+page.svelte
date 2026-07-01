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
