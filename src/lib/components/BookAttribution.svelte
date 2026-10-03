<!--
  BookAttribution — compact per-page licence + credit footer.

  Renders on every section/chapter page (and in the print routes) so each page view
  satisfies the CC/OpenStax attribution requirements: credit OpenStax, name the book,
  link to the free original, state the licence (linked), and indicate changes were made.

  DATA-DRIVEN: the NonCommercial + ShareAlike notices appear purely because the book's
  licence descriptor carries those flags — there are no per-book conditionals here.

  FAIL-LOUD: invalid/missing attribution renders a visible placeholder and logs a
  console error naming the book and the offending fields, rather than silently nothing.
-->
<script lang="ts">
	import { getLicence, validateAttribution, type BookAttribution } from '$lib/data/licences';

	let {
		attribution,
		bookSlug
	}: {
		attribution: BookAttribution | undefined;
		bookSlug: string;
	} = $props();

	let errors = $derived(validateAttribution(attribution));
	let valid = $derived(errors.length === 0);

	$effect(() => {
		if (!valid) {
			console.error(
				`[BookAttribution] Vantar eða gölluð leyfis-lýsigögn fyrir "${bookSlug}":\n` +
					errors.map((e) => `  • ${e}`).join('\n')
			);
		}
	});

	let licence = $derived(valid ? getLicence(attribution!.derivativeLicence) : null);
</script>

{#if valid && attribution && licence}
	<aside class="book-attribution" aria-label="Heimild og leyfi">
		<p class="book-attribution__credit">
			Byggt á
			<a href={attribution.sourceUrl} target="_blank" rel="noopener noreferrer">
				{attribution.originalTitle}</a
			>
			eftir {attribution.originalAuthors.join(', ')} ({attribution.publisher}). Íslensk þýðing —
			breytingar gerðar.
		</p>
		<p class="book-attribution__licence">
			Leyfi:
			<a href={licence.url} target="_blank" rel="license noopener noreferrer">{licence.name}</a>.
			{#each licence.notices as notice (notice)}
				<span class="book-attribution__notice">{notice}</span>
			{/each}
		</p>
		<p class="book-attribution__more">
			<a href={`/${bookSlug}/leyfi`}>Nánar um leyfi og heimildir</a>
		</p>
	</aside>
{:else}
	<aside class="book-attribution book-attribution--error" role="alert">
		<p>
			<strong>Leyfisupplýsingar vantar.</strong> Ekki tókst að birta heimildar- og leyfisupplýsingar
			fyrir þessa bók ({bookSlug}). Vinsamlegast tilkynnið þetta.
		</p>
	</aside>
{/if}

<style>
	.book-attribution {
		margin-top: 2.5rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--border-color);
		font-size: 0.8125rem;
		line-height: 1.5;
		color: var(--text-secondary);
	}

	.book-attribution p {
		margin: 0 0 0.375rem;
	}

	.book-attribution a {
		color: var(--accent-hover);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.book-attribution a:hover {
		color: var(--accent-color, #c78c20);
	}

	.book-attribution__notice {
		display: inline;
	}

	.book-attribution__notice::before {
		content: ' ';
	}

	.book-attribution__more {
		margin-bottom: 0;
		font-weight: 500;
	}

	.book-attribution--error {
		border-top-color: #d97706;
		color: #b45309;
	}

	:global(.dark) .book-attribution--error {
		color: #e8a838;
	}

	/* Unlike the MT PreviewBanner, attribution MUST remain visible in print —
	   a distributed PDF carries the same licence obligations as a web page. */
	@media print {
		.book-attribution {
			margin-top: 1.5rem;
			color: #333;
		}
	}
</style>
