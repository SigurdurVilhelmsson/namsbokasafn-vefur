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
	import ErrorMessage from '$lib/components/ErrorMessage.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';

	export let data: PageData;

	let toc: TableOfContents | null = null;
	let loading = true;
	let error: string | null = null;

	// Subscribe to reader progress for reactivity
	$: progress = $reader.progress;

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
		return calcChapterProgress(progress, getChapterPath(chapter), chapter.sections.length);
	}

	// Get attribution data (supports both 'source' and 'attribution' fields with v1/v2 field names)
	$: attribution = toc?.source || toc?.attribution;
	// Handle both v1 field names (original, authors) and v2 field names (originalTitle, originalAuthors)
	$: originalTitle = attribution?.original || (attribution as any)?.originalTitle;
	$: authors = attribution?.authors || (attribution as any)?.originalAuthors;
</script>

<svelte:head>
	<title>{data.book?.title ?? 'Bók'} | Námsbókasafn</title>
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
		<DownloadBookButton bookSlug={data.bookSlug} />
	</div>

	{#if loading}
		<div class="chapter-grid">
			{#each Array(6) as _}
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
			{#each toc.chapters as chapter}
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
							{#each chapter.sections as section}
								{@const sectionPath = getSectionPath(section)}
								{@const isRead = isSectionRead(progress, chapterPath, sectionPath)}
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

		<!-- Attribution -->
		{#if attribution}
			<div class="book-attribution">
				<h3 class="book-attribution-heading">
					Um bókina
				</h3>
				<div class="book-attribution-content">
					{#if originalTitle}
						<p><strong>Upprunalegt efni:</strong> {originalTitle}</p>
					{/if}
					{#if authors}
						<p><strong>Höfundar:</strong> {authors}</p>
					{/if}
					{#if attribution.translator}
						<p><strong>Þýðandi:</strong> {attribution.translator}</p>
					{/if}
					{#if attribution.license}
						<p>
							<strong>Leyfi:</strong>
							{#if attribution.licenseUrl}
								<a href={attribution.licenseUrl} target="_blank" rel="noopener noreferrer" class="attribution-link">
									{attribution.license}
								</a>
							{:else}
								{attribution.license}
							{/if}
						</p>
					{/if}
				</div>
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

	.attribution-link {
		color: var(--accent-color);
		text-decoration: none;
	}

	.attribution-link:hover {
		color: var(--accent-hover);
		text-decoration: underline;
	}
</style>
