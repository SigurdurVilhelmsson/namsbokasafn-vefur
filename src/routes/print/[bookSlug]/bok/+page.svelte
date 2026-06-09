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

	function chapterPage(chapterNum: number): number | null {
		return data.tocPages?.chapters.find((c) => c.number === chapterNum)?.page ?? null;
	}
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
				{#if chapterPage(chapter.number) !== null}
					<span class="toc-page">{chapterPage(chapter.number)}</span>
				{/if}
			</li>
		{/each}
		{#if data.appendices.length > 0}
			<li>
				<span>
					<span class="toc-chapter-num" aria-hidden="true"></span>
					Viðaukar
					({data.appendices.map((a) => a.letter).join(', ')})
				</span>
				{#if data.tocPages?.appendicesPage != null}
					<span class="toc-page">{data.tocPages.appendicesPage}</span>
				{/if}
			</li>
		{/if}
	</ol>
</section>
