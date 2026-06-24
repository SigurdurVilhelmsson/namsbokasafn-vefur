<!--
  Colophon / licence page — /[bookSlug]/leyfi

  Full multi-source attribution for one book: original title/authors/publisher, the
  free-access source, every obtained source (format + date + licence), the derivative
  licence this Icelandic work carries, translators, the statement of modifications,
  OpenStax's free-access line, and a link to the provenance report.

  DATA-DRIVEN: NonCommercial/ShareAlike terms surface from the licence descriptor flags.
  FAIL-LOUD: invalid/missing attribution renders a visible error and logs to the console.
-->
<script lang="ts">
	import type { PageData } from './$types';
	import { getLicence, validateAttribution } from '$lib/data/licences';
	import LicenceBadge from '$lib/components/LicenceBadge.svelte';

	let { data }: { data: PageData } = $props();

	let attribution = $derived(data.book?.attribution);
	let errors = $derived(validateAttribution(attribution));
	let valid = $derived(errors.length === 0);
	let licence = $derived(valid ? getLicence(attribution!.derivativeLicence) : null);

	$effect(() => {
		if (!valid) {
			console.error(
				`[leyfi] Vantar eða gölluð leyfis-lýsigögn fyrir "${data.bookSlug}":\n` +
					errors.map((e) => `  • ${e}`).join('\n')
			);
		}
	});

	const FORMAT_LABELS: Record<string, string> = {
		docx: 'Word-skjal (.docx)',
		cnxml: 'CNXML (OpenStax)'
	};
</script>

<svelte:head>
	<title>Leyfi og heimildir — {data.book?.title ?? 'Bók'} | Námsbókasafn</title>
	<meta name="robots" content="index, follow" />
	<link rel="canonical" href="https://namsbokasafn.is/{data.bookSlug}/leyfi" />
</svelte:head>

<div class="colophon">
	<a class="colophon__back" href={`/${data.bookSlug}`}>← Til baka í {data.book?.title ?? 'bók'}</a>
	<h1 class="colophon__title">Leyfi og heimildir</h1>

	{#if valid && attribution && licence}
		<p class="colophon__lede">
			{data.book?.title} er íslensk þýðing á opnu námsefni frá OpenStax. Hér eru fullar heimildir og
			leyfisupplýsingar.
		</p>

		<section class="colophon__section">
			<h2>Upprunalegt verk</h2>
			<dl>
				<dt>Titill</dt>
				<dd>{attribution.originalTitle}</dd>
				<dt>Höfundar</dt>
				<dd>{attribution.originalAuthors.join(', ')}</dd>
				<dt>Útgefandi</dt>
				<dd>{attribution.publisher}</dd>
				<dt>Frumefni (ókeypis aðgangur)</dt>
				<dd>
					<a href={attribution.sourceUrl} target="_blank" rel="noopener noreferrer">
						{attribution.sourceUrl}
					</a>
				</dd>
			</dl>
		</section>

		<section class="colophon__section">
			<h2>Þessi útgáfa</h2>
			<dl>
				<dt>Þýðing</dt>
				<dd>{attribution.translators}</dd>
				<dt>Breytingar</dt>
				<dd>{attribution.modifications}</dd>
				<dt>Leyfi þessarar útgáfu</dt>
				<dd class="colophon__licence">
					<LicenceBadge code={attribution.derivativeLicence} size="md" />
					<span>{licence.fullName}</span>
				</dd>
			</dl>
			{#if licence.notices.length > 0}
				<ul class="colophon__notices">
					{#each licence.notices as notice (notice)}
						<li>{notice}</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="colophon__section">
			<h2>Heimildir</h2>
			<p class="colophon__hint">
				Leyfi þessarar útgáfu ræðst af því leyfi sem var í gildi þegar hvert frumefni var sótt — það
				strangasta gildir. Creative Commons leyfi eru óafturkræf fyrir það eintak sem sótt var.
			</p>
			<ul class="colophon__sources">
				{#each attribution.sources as src (src.format + src.obtained)}
					<li>
						<strong>{FORMAT_LABELS[src.format] ?? src.format}</strong>
						<span class="colophon__source-meta">
							Sótt {src.obtained} ·
							<a href={src.licenceUrl} target="_blank" rel="license noopener noreferrer">
								{getLicence(src.licenceAtObtaining).name}
							</a>
						</span>
						{#if src.collection || src.upstreamRepo}
							<span class="colophon__source-meta">
								Safn: {src.collection ?? src.upstreamRepo}
							</span>
						{/if}
						{#if src.chaptersCovered}
							<span class="colophon__source-meta">{src.chaptersCovered}</span>
						{/if}
						{#if src.upstreamChangeCommit}
							<span class="colophon__source-meta">Endurleyfun: {src.upstreamChangeCommit}</span>
						{/if}
					</li>
				{/each}
			</ul>
		</section>

		<section class="colophon__section">
			<h2>OpenStax</h2>
			<p>
				Upprunalega efnið er gefið út af OpenStax, Rice University, sem býður opnar kennslubækur
				gjaldfrjálst. Aðgangur að frumefninu er ókeypis á
				<a href={attribution.sourceUrl} target="_blank" rel="noopener noreferrer">openstax.org</a>.
				Námsbókasafn er sjálfstætt verkefni og ekki tengt OpenStax.
			</p>
			<p>
				<a href={attribution.provenanceRef} target="_blank" rel="noopener noreferrer">
					Skoða heimildaskýrslu (provenance)
				</a>
			</p>
		</section>
	{:else}
		<div class="colophon__error" role="alert">
			<p>
				<strong>Leyfisupplýsingar vantar.</strong> Ekki tókst að birta heimildir fyrir þessa bók ({data.bookSlug}).
				Vinsamlegast tilkynnið þetta.
			</p>
		</div>
	{/if}
</div>

<style>
	.colophon {
		max-width: 48rem;
		margin: 0 auto;
		padding: 2rem 1rem 4rem;
	}

	.colophon__back {
		display: inline-block;
		margin-bottom: 1.5rem;
		font-size: 0.875rem;
		color: var(--accent-hover);
		text-decoration: none;
	}

	.colophon__back:hover {
		text-decoration: underline;
	}

	.colophon__title {
		font-family: 'Bricolage Grotesque', system-ui, sans-serif;
		font-size: 2rem;
		margin: 0 0 0.5rem;
		color: var(--text-primary);
	}

	.colophon__lede {
		color: var(--text-secondary);
		margin-bottom: 2rem;
	}

	.colophon__section {
		margin-bottom: 2.5rem;
	}

	.colophon__section h2 {
		font-family: 'Bricolage Grotesque', system-ui, sans-serif;
		font-size: 1.25rem;
		margin: 0 0 1rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--border-color);
		color: var(--text-primary);
	}

	dl {
		display: grid;
		grid-template-columns: minmax(8rem, max-content) 1fr;
		gap: 0.5rem 1.5rem;
		margin: 0;
	}

	dt {
		font-weight: 600;
		color: var(--text-secondary);
	}

	dd {
		margin: 0;
		color: var(--text-primary);
	}

	.colophon__licence {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		flex-wrap: wrap;
	}

	.colophon__notices {
		margin: 1rem 0 0;
		padding-left: 1.25rem;
		color: var(--text-secondary);
		font-size: 0.9375rem;
	}

	.colophon__hint,
	.colophon__source-meta {
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	.colophon__sources {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.colophon__sources li {
		padding: 0.875rem 1rem;
		margin-bottom: 0.75rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg, 0.75rem);
		background: var(--bg-tertiary);
	}

	.colophon__sources li > * {
		display: block;
	}

	.colophon__source-meta {
		margin-top: 0.25rem;
	}

	.colophon a {
		color: var(--accent-hover);
	}

	.colophon__error {
		padding: 1rem 1.25rem;
		border: 1px solid #d97706;
		border-radius: var(--radius-md, 0.5rem);
		color: #b45309;
		background: #fffbeb;
	}

	:global(.dark) .colophon__error {
		background: #2a2418;
		color: #e8a838;
	}
</style>
