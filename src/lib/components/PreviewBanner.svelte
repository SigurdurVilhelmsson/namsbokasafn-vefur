<!--
  PreviewBanner — machine-translation notice.

  Shown at the top of a section when its module has NOT been human-reviewed
  (i.e. it comes from the mt-preview baseline rather than the faithful overlay).
  Reviewed modules carry `reviewed: true` in toc.json and omit this banner.

  Provenance comes from the reader (section.reviewed), not the content HTML, so
  the styling is governed by the design system and the banner is excluded from
  print/PDF.
-->
<aside class="preview-banner" role="note" aria-label="Vélþýtt efni">
	<svg
		class="preview-banner__icon"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		aria-hidden="true"
	>
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="2"
			d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
		/>
	</svg>
	<p class="preview-banner__text">
		<strong>Vélþýtt efni.</strong>
		Þessi eining hefur ekki enn verið yfirlesin og kann að innihalda þýðingarvillur.
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

	.preview-banner__icon {
		flex-shrink: 0;
		width: 1.25rem;
		height: 1.25rem;
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

	:global(.dark) .preview-banner {
		border-color: #5a4413;
		border-left-color: #e8a838;
		background: #2a2418;
		color: var(--text-primary);
	}

	:global(.dark) .preview-banner__icon {
		color: #e8a838;
	}

	@media print {
		.preview-banner {
			display: none;
		}
	}
</style>
