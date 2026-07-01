<!--
  Standalone-chapter colophon page. Rendered once per book by generate-pdfs.js
  and appended (pdf-lib) only to each standalone chapter PDF — NOT merged into
  the full book (which carries one front-matter colophon instead of 22).
-->
<script lang="ts">
	import type { PageData } from './$types';
	import { getLicence } from '$lib/data/licences';
	import { creditLine } from '$lib/data/bookCredits';

	let { data }: { data: PageData } = $props();

	let attribution = $derived(data.book.attribution);
	let licence = $derived(getLicence(attribution.derivativeLicence));
	let credit = $derived(creditLine(data.book.slug, data.book.status, attribution.translators));
</script>

<svelte:head>
	<title>{data.book.title} — um útgáfuna</title>
</svelte:head>

<section class="print-colophon-page">
	<p class="colophon-eyebrow">Um þessa útgáfu</p>
	<h1 class="colophon-heading">{data.book.title}</h1>
	<p class="colophon-sub">{data.book.subtitle}</p>

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
	</div>
</section>
