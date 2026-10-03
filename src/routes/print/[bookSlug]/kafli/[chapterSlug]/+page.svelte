<!--
  Print view of a single chapter — cover page + concatenated sections +
  end-of-chapter pages + answer key. Loaded by Playwright at PDF generation
  time and printed with page.pdf().
-->
<script lang="ts">
	import type { PageData } from './$types';
	import { format } from 'date-fns';
	import { is } from 'date-fns/locale';

	let { data }: { data: PageData } = $props();

	// PDF build date (Icelandic via date-fns; Intl fails under Node small-ICU).
	const buildDate = format(new Date(), 'd. MMMM yyyy', { locale: is });
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
	<p class="cover-meta">
		Útgáfudagur PDF-skjals: {buildDate}<br />
		namsbokasafn.is
	</p>
</section>

<!--
  block.content is HTML extracted from files in static/content/ — committed
  to the repo and reviewed via PR, never user input. {@html} renders only
  that trusted source whether the page is served prerendered (URLs in
  entries()) or via the adapter-static SPA fallback (load() 404s anything
  not in entries()). Trust comes from the content source, not the runtime.
-->
{#each data.blocks as block, i (i)}
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html block.content}
{/each}

<!-- The attribution colophon is NOT rendered inline here: generate-pdfs.js
     appends a dedicated colophon page (/print/<slug>/colophon) to the standalone
     chapter PDF only, so it never repeats through the merged full book. -->
