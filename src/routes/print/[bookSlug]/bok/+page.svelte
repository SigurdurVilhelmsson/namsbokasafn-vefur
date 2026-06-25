<!--
  Print front-matter for the full-book PDF — title page + table of contents.
  Playwright prints this and pdf-lib merges it with the per-chapter PDFs.
-->
<script lang="ts">
	import type { PageData } from './$types';
	import { getLicence } from '$lib/data/licences';
	import { creditLine } from '$lib/data/bookCredits';

	let { data }: { data: PageData } = $props();

	let attribution = $derived(data.book.attribution);
	let licence = $derived(getLicence(attribution.derivativeLicence));
	// Method-accurate translation credit (machine vs human), not a blanket "Þýðing".
	let credit = $derived(creditLine(data.book.slug, data.book.status, attribution.translators));

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
		{credit}<br />
		Byggt á {attribution.originalTitle} eftir {attribution.originalAuthors.join(', ')}<br />
		Útgefandi frumefnis: {attribution.publisher} — {attribution.sourceUrl}<br />
		Leyfi: {licence.name} ({licence.fullName})<br />
		Sótt {today} af namsbokasafn.is
	</p>
	{#if licence.notices.length > 0}
		<p class="cover-notice">
			{licence.notices.join(' ')}
		</p>
	{/if}
	<p class="cover-notice">Aðgangur að frumefninu er ókeypis á openstax.org.</p>
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
