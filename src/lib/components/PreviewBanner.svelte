<!--
  PreviewBanner — machine-translation notice.

  Shown at the top of a section when its module has NOT been human-reviewed
  (i.e. it comes from the mt-preview baseline rather than the faithful overlay).
  Reviewed modules carry `reviewed: true` in toc.json and omit this banner.

  Provenance comes from the reader (section.reviewed), not the content HTML, so
  the styling is governed by the design system and the banner is excluded from
  print/PDF.

  'Tilkynna villu' opens /feedback with this section's book, chapter and
  section filled in (plan step S3.3, register PED-15).
-->
<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { feedbackHref } from '$lib/utils/feedbackPrefill';

	let { bookSlug, chapterSlug, sectionSlug }: { bookSlug: string; chapterSlug: string; sectionSlug: string } =
		$props();
</script>

<aside class="preview-banner" role="note" aria-label="Vélþýtt efni">
	<Icon name="triangle-alert" class="preview-banner__icon" />
	<p class="preview-banner__text">
		<strong>Vélþýtt efni.</strong>
		Þessi eining hefur ekki enn verið yfirlesin og kann að innihalda þýðingarvillur.
		<a class="preview-banner__report" href={feedbackHref({ bok: bookSlug, kafli: chapterSlug, hluti: sectionSlug })}
			>Tilkynna villu</a
		>
	</p>
</aside>

<style>
	.preview-banner {
		display: flex;
		align-items: flex-start;
		gap: 0.625rem;
		margin-bottom: 1.5rem;
		padding: 0.75rem 1rem;
		border: 1px solid #f5d9a8;
		border-left-width: 4px;
		border-left-color: #d97706;
		border-radius: var(--radius-md);
		background: #fffbeb;
		color: var(--text-primary);
	}

	:global(.preview-banner__icon) {
		flex-shrink: 0;
		margin-top: 0.1rem;
		color: #d97706;
	}

	.preview-banner__text {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.preview-banner__text strong {
		font-weight: 600;
	}

	/* Bronze on the banner's cream is 5.54:1 in light, amber on its brown 7.40:1 in dark.
	   Underlined at rest: bronze is 2.60:1 from the text beside it, under axe's 3:1. */
	.preview-banner__report {
		color: var(--accent-strong);
		font-weight: 600;
		text-decoration: underline;
		text-underline-offset: 2px;
		white-space: nowrap;
	}

	.preview-banner__report:hover {
		text-decoration-thickness: 2px;
	}

	:global(.dark) .preview-banner {
		border-color: #5a4413;
		border-left-color: #e8a838;
		background: #2a2418;
		color: var(--text-primary);
	}

	:global(.dark .preview-banner__icon) {
		color: #e8a838;
	}

	@media print {
		.preview-banner {
			display: none;
		}
	}
</style>
