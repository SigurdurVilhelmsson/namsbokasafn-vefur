<!--
  Print view of a single chapter — cover page + concatenated sections +
  end-of-chapter pages + answer key. Loaded by Playwright at PDF generation
  time and printed with page.pdf().
-->
<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.bookTitle} — Kafli {data.chapter.number}: {data.chapter.title}</title>
</svelte:head>

<!-- Cover page -->
<section class="print-cover">
	<p class="cover-eyebrow">{data.bookTitle}</p>
	<p class="cover-chapter-number">{data.chapter.number}</p>
	<h1 class="cover-title">{data.chapter.title}</h1>
	<p class="cover-book-title">{data.bookSubtitle}</p>
	<p class="cover-meta">namsbokasafn.is</p>
</section>

<!-- Concatenated content blocks -->
{#each data.blocks as block, i (i)}
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html block.content}
{/each}
