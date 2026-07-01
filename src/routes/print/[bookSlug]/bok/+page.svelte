<!--
  Print front-matter for the full-book PDF — title page + table of contents.
  Playwright prints this and pdf-lib merges it with the per-chapter PDFs.
-->
<script lang="ts">
	import type { PageData } from './$types';
	import { getLicence } from '$lib/data/licences';
	import { creditLine } from '$lib/data/bookCredits';
	import { format } from 'date-fns';
	import { is } from 'date-fns/locale';

	let { data }: { data: PageData } = $props();

	let attribution = $derived(data.book.attribution);
	let licence = $derived(getLicence(attribution.derivativeLicence));
	// Method-accurate translation credit (machine vs human), not a blanket "Þýðing".
	let credit = $derived(creditLine(data.book.slug, data.book.status, attribution.translators));

	// PDF build date. date-fns + `is` locale gives Icelandic month names reliably;
	// Intl `toLocaleDateString('is-IS')` fails under Node small-ICU (renders English).
	// PDFs are regenerated as proofread content lands, so the reader must be able to
	// tell which version they hold.
	const buildDate = format(new Date(), 'd. MMMM yyyy', { locale: is });

	function chapterPage(chapterNum: number): number | null {
		return data.tocPages?.chapters.find((c) => c.number === chapterNum)?.page ?? null;
	}
</script>

<svelte:head>
	<title>{data.book.title} — {data.book.subtitle}</title>
</svelte:head>

<!-- Title page -->
<section class="print-cover print-book-cover">
	<div class="cover-hero">
		<p class="cover-eyebrow">Námsbókasafn</p>
		<h1 class="cover-title">{data.book.title}</h1>
		<div class="cover-rule" aria-hidden="true"></div>
		<p class="cover-book-title">{data.book.subtitle}</p>
	</div>

	<!-- Colophon: full CC-BY / CC-BY-NC-SA attribution incl. licence URL and the
	     required modification statement (this is an Icelandic derivative). -->
	<div class="print-colophon">
		<p class="colophon-credit">{credit}</p>
		<p>
			Byggt á <span class="colophon-work">{attribution.originalTitle}</span> eftir
			{attribution.originalAuthors.join(', ')}.
		</p>
		<p>Útgefandi frumefnis: {attribution.publisher} — {attribution.sourceUrl}</p>
		<p>Leyfi: {licence.name} ({licence.fullName}) — {licence.url}</p>
		<p>{attribution.modifications}</p>
		{#if licence.notices.length > 0}
			<p>{licence.notices.join(' ')}</p>
		{/if}
		<p>Aðgangur að frumefninu er ókeypis á openstax.org.</p>
		<p class="colophon-fetched">
			Útgáfudagur PDF-skjals: {buildDate} · namsbokasafn.is
		</p>
	</div>
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
