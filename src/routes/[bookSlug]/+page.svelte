<!--
  Book Home Page - Shows book overview and chapter list
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import type { TableOfContents, Chapter } from '$lib/types/content';
	import { loadTableOfContents, getChapterPath, getSectionPath } from '$lib/utils/contentLoader';
	import { reader } from '$lib/stores';
	import { calcChapterProgress, isSectionRead } from '$lib/stores/reader';
	import DownloadBookButton from '$lib/components/DownloadBookButton.svelte';
	import PdfDownloadButton from '$lib/components/PdfDownloadButton.svelte';
	import LicenceBadge from '$lib/components/LicenceBadge.svelte';
	import { getLicence } from '$lib/data/licences';
	import ErrorMessage from '$lib/components/ErrorMessage.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';

	let { data }: { data: PageData } = $props();

	let toc: TableOfContents | null = $state(null);
	let loading = $state(true);
	let error: string | null = $state(null);

	// Subscribe to reader progress for reactivity
	let progress = $derived($reader.progress);

	async function loadContent() {
		loading = true;
		error = null;
		try {
			toc = await loadTableOfContents(data.bookSlug);
		} catch (e) {
			error = 'Gat ekki hlaðið efnisyfirliti. Athugaðu nettengingu eða reyndu aftur síðar.';
			console.error('Failed to load table of contents:', e);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadContent();
	});

	// Reactive helper using subscribed progress
	function getChapterProgressPercent(chapter: Chapter): number {
		return calcChapterProgress(progress, data.bookSlug, getChapterPath(chapter), chapter.sections.length);
	}

	// Attribution comes from the per-book metadata in book.ts (the populated source of
	// truth), not from toc.json. The legacy toc.source/attribution path was always
	// undefined (the book-home block never rendered).
	let attribution = $derived(data.book?.attribution);
	let licence = $derived(attribution ? getLicence(attribution.derivativeLicence) : null);

	// Book-specific, licence-correct meta description (no blanket CC BY claim).
	let metaDescription = $derived(
		attribution && licence
			? `Opið námsefni: íslensk þýðing á OpenStax ${attribution.originalTitle}, gefin út með ${licence.name} leyfi.`
			: 'Opið námsefni — íslenskar þýðingar á OpenStax kennslubókum.'
	);
</script>

<svelte:head>
	<title>{data.book?.title ?? 'Bók'} | Námsbókasafn</title>
	<meta name="description" content={metaDescription} />
	<meta name="robots" content="index, follow" />
	<link rel="canonical" href="https://namsbokasafn.is/{data.bookSlug}" />
	<meta property="og:title" content="{data.book?.title ?? 'Bók'} | Námsbókasafn" />
	<meta property="og:description" content={metaDescription} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://namsbokasafn.is/{data.bookSlug}" />
</svelte:head>

<div class="book-home">
	<!-- Welcome section -->
	<div class="book-home-header">
		<h1 class="book-home-title">
			{data.book?.title ?? 'Bók'}
		</h1>
		<p class="book-home-subtitle">
			Veldu kafla til að byrja að lesa
		</p>
		<div class="book-home-actions">
			<DownloadBookButton bookSlug={data.bookSlug} />
			<PdfDownloadButton
				manifest={data.pdfManifest}
				bookSlug={data.bookSlug}
				target="full"
				variant="primary"
			/>
		</div>
	</div>

	{#if loading}
		<div class="chapter-grid">
			{#each Array(6) as _, i (i)}
				<Skeleton variant="card" />
			{/each}
		</div>
	{:else if error}
		<ErrorMessage
			message={error}
			onRetry={loadContent}
			showBackLink={true}
			backHref="/"
			backLabel="Til baka í bókasafn"
		/>
	{:else if toc}
		<!-- Chapter grid -->
		<div class="chapter-grid">
			{#each toc.chapters as chapter (chapter.number)}
				{@const chapterPath = getChapterPath(chapter)}
				{@const progressPercent = getChapterProgressPercent(chapter)}
				{@const firstSection = chapter.sections[0]}
				{@const firstSectionPath = firstSection ? getSectionPath(firstSection) : ''}
				<a
					href="/{data.bookSlug}/kafli/{chapterPath}/{firstSectionPath}"
					class="chapter-card"
				>
					<div class="chapter-card-header">
						<span class="chapter-number">
							{chapter.number}
						</span>
						{#if progressPercent > 0}
							<span class="chapter-progress-label">
								{progressPercent}%
							</span>
						{/if}
					</div>

					<h2 class="chapter-card-title">
						{chapter.title}
					</h2>

					<p class="chapter-card-meta">
						{chapter.sections.length} kaflar
					</p>

					<!-- Section progress dots -->
					{#if chapter.sections.length > 0}
						<div class="chapter-dots" aria-label="Framvinda kafla">
							{#each chapter.sections as section (section.file)}
								{@const sectionPath = getSectionPath(section)}
								{@const isRead = isSectionRead(progress, data.bookSlug, chapterPath, sectionPath)}
								<span
									class="chapter-dot {isRead ? 'read' : ''}"
									title="{section.number} {section.title}{isRead ? ' (lesið)' : ''}"
								></span>
							{/each}
						</div>
					{/if}

					{#if progressPercent > 0}
						<div class="chapter-progress-bar">
							<div
								class="chapter-progress-fill"
								style="width: {progressPercent}%"
							></div>
						</div>
					{/if}
				</a>
			{/each}
		</div>

		<!-- Attribution (from per-book metadata; full provenance on the colophon page) -->
		{#if attribution && licence}
			<div class="book-attribution">
				<h3 class="book-attribution-heading">Um bókina</h3>
				<div class="book-attribution-content">
					<p><strong>Upprunalegt efni:</strong> {attribution.originalTitle}</p>
					<p><strong>Höfundar:</strong> {attribution.originalAuthors.join(', ')}</p>
					<p><strong>Útgefandi:</strong> {attribution.publisher}</p>
					<p><strong>Þýðandi:</strong> {attribution.translators}</p>
					<p class="book-attribution-licence">
						<strong>Leyfi:</strong>
						<LicenceBadge code={attribution.derivativeLicence} size="md" />
					</p>
					{#each licence.notices as notice (notice)}
						<p class="book-attribution-notice">{notice}</p>
					{/each}
				</div>
				<a class="book-attribution-colophon" href={`/${data.bookSlug}/leyfi`}>
					Leyfi og heimildir
				</a>
			</div>
		{/if}
	{/if}
</div>

<style>
	.book-home-header {
		margin-bottom: 2rem;
	}

	.book-home-title {
		font-family: "Bricolage Grotesque", system-ui, sans-serif;
		font-size: 1.875rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
	}

	.book-home-subtitle {
		color: var(--text-secondary);
		margin-bottom: 1rem;
	}

	.book-home-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
	}

	/* Chapter grid */
	.chapter-grid {
		display: grid;
		gap: 1rem;
	}

	@media (min-width: 768px) {
		.chapter-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 1024px) {
		.chapter-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	/* Chapter card */
	.chapter-card {
		display: block;
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-color);
		border-left: 3px solid var(--accent-color);
		background: var(--bg-secondary);
		padding: 1.5rem;
		transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
	}

	.chapter-card:hover {
		border-color: var(--accent-color);
		box-shadow: var(--shadow-lg);
	}

	.chapter-card-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}

	.chapter-number {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: var(--radius-full);
		background: var(--accent-color);
		color: #ffffff;
		font-weight: 700;
		font-size: 0.875rem;
	}

	.chapter-progress-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--accent-color);
	}

	.chapter-card-title {
		font-family: "Bricolage Grotesque", system-ui, sans-serif;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
		transition: color 0.15s;
	}

	.chapter-card:hover .chapter-card-title {
		color: var(--accent-color);
	}

	.chapter-card-meta {
		font-size: 0.875rem;
		color: var(--text-secondary);
		margin-bottom: 0.75rem;
	}

	/* Progress dots */
	.chapter-dots {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin-bottom: 1rem;
	}

	.chapter-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: var(--radius-full);
		background: var(--border-color);
		transition: background-color 0.2s;
	}

	.chapter-dot.read {
		background: var(--accent-color);
	}

	/* Progress bar */
	.chapter-progress-bar {
		height: 0.375rem;
		overflow: hidden;
		border-radius: var(--radius-full);
		background: var(--bg-tertiary);
	}

	.chapter-progress-fill {
		height: 100%;
		border-radius: var(--radius-full);
		background: var(--accent-color);
		transition: width 0.3s ease;
	}

	/* Attribution */
	.book-attribution {
		margin-top: 3rem;
		padding-top: 2rem;
		border-top: 1px solid var(--border-color);
	}

	.book-attribution-heading {
		font-family: "Bricolage Grotesque", system-ui, sans-serif;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 1rem;
	}

	.book-attribution-content {
		font-size: 0.875rem;
		color: var(--text-secondary);
		background: var(--bg-tertiary);
		border-radius: var(--radius-lg);
		padding: 1.25rem;
	}

	.book-attribution-content p {
		margin-bottom: 0.25rem;
	}

	.book-attribution-content p:last-child {
		margin-bottom: 0;
	}

	.book-attribution-licence {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.book-attribution-notice {
		margin-top: 0.25rem;
		font-size: 0.8125rem;
		font-style: italic;
	}

	.book-attribution-colophon {
		display: inline-block;
		margin-top: 0.75rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--accent-hover);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.book-attribution-colophon:hover {
		color: var(--accent-color);
	}
</style>
