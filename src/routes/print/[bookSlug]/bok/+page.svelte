<!--
  Print front-matter for the full-book PDF — title page + table of contents.
  Playwright prints this and pdf-lib merges it with the per-chapter PDFs.
-->
<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const today = new Date().toLocaleDateString('is-IS', {
		year: 'numeric',
		month: 'long'
	});
</script>

<svelte:head>
	<title>{data.book.title} — {data.book.subtitle}</title>
</svelte:head>

<!-- Title page -->
<section class="print-cover">
	<p class="cover-eyebrow">Námsbókasafn</p>
	<h1 class="cover-title">{data.book.title}</h1>
	<p class="cover-book-title">{data.book.subtitle}</p>
	<p class="cover-meta">
		Þýðing: {data.book.translator}<br />
		Heimild: {data.book.source.title}, {data.book.source.publisher}<br />
		Leyfi: {data.book.source.license}<br />
		Sótt {today} af namsbokasafn.is
	</p>
</section>

<!-- Table of contents -->
<section class="print-toc">
	<h1>Efnisyfirlit</h1>
	<ol>
		{#each data.chapters as chapter (chapter.number)}
			<li>
				<span>
					<span class="toc-chapter-num">{chapter.number}.</span>
					{chapter.title}
				</span>
			</li>
		{/each}
	</ol>
</section>
