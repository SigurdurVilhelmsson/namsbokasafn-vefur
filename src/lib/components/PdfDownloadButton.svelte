<!--
  PdfDownloadButton - Download a pre-generated PDF of a chapter or full book.

  PDFs are produced by scripts/generate-pdfs.js and live as static files at
  /downloads/{bookSlug}/. The companion manifest.json (loaded by the book
  layout) tells us which files exist and how big they are. If the manifest
  is missing or the requested file isn't in it, the button hides itself —
  this happens during local dev before pdfs are generated.
-->
<script lang="ts">
	import type { PdfManifest } from '$lib/types/pdf';

	interface Props {
		manifest: PdfManifest | null;
		bookSlug: string;
		/** 'full' = whole book; 'chapter' = single chapter (requires chapterNum). */
		target: 'full' | 'chapter';
		/** Required when target === 'chapter'. */
		chapterNum?: number;
		/** 'primary' = filled button (book home), 'compact' = subtle inline (chapter header), 'icon' = single-icon toolbar button. */
		variant?: 'primary' | 'compact' | 'icon';
	}

	let { manifest, bookSlug, target, chapterNum, variant = 'primary' }: Props = $props();

	function formatBytes(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		const kb = bytes / 1024;
		if (kb < 1024) return `${Math.round(kb)} KB`;
		const mb = kb / 1024;
		return mb >= 10 ? `${Math.round(mb)} MB` : `${mb.toFixed(1).replace('.', ',')} MB`;
	}

	let entry = $derived.by(() => {
		if (!manifest) return null;
		if (target === 'full') return manifest.full;
		if (chapterNum == null) return null;
		return manifest.chapters.find((c) => c.chapterNum === chapterNum) ?? null;
	});

	let href = $derived(entry ? `/downloads/${bookSlug}/${entry.file}` : null);
	let sizeLabel = $derived(entry ? formatBytes(entry.sizeBytes) : '');

	let label = $derived.by(() => {
		if (target === 'full') return 'Sækja bók sem PDF';
		return chapterNum != null ? `Sækja kafla ${chapterNum} sem PDF` : 'Sækja kafla sem PDF';
	});
</script>

{#if href}
	{#if variant === 'primary'}
		<a
			{href}
			download
			class="pdf-btn pdf-btn-primary"
			aria-label="{label} ({sizeLabel})"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
				/>
			</svg>
			<span>{label}</span>
			<span class="pdf-btn-size">({sizeLabel})</span>
		</a>
	{:else if variant === 'compact'}
		<a
			{href}
			download
			class="pdf-btn pdf-btn-compact"
			aria-label="{label} ({sizeLabel})"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
				/>
			</svg>
			<span>{label}</span>
			<span class="pdf-btn-size">{sizeLabel}</span>
		</a>
	{:else}
		<a
			{href}
			download
			class="pdf-btn-icon"
			aria-label="{label} ({sizeLabel})"
			title="{label} ({sizeLabel})"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
				/>
			</svg>
		</a>
	{/if}
{/if}

<style>
	.pdf-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
		transition: all 0.15s ease;
	}

	.pdf-btn-primary {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: white;
		background: var(--accent-color, #c78c20);
		border-radius: 0.5rem;
	}

	.pdf-btn-primary:hover {
		background: var(--accent-hover, #b07918);
	}

	.pdf-btn-primary:focus-visible {
		outline: 2px solid var(--accent-color, #c78c20);
		outline-offset: 2px;
	}

	.pdf-btn-compact {
		padding: 0.4rem 0.75rem;
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--accent-color, #c78c20);
		background: var(--accent-light, rgba(199, 140, 32, 0.1));
		border-radius: 0.4rem;
	}

	.pdf-btn-compact:hover {
		background: var(--accent-subtle, rgba(199, 140, 32, 0.18));
	}

	.pdf-btn-size {
		opacity: 0.8;
		font-weight: 400;
	}

	.pdf-btn-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		border-radius: 0.5rem;
		color: rgb(156 163 175); /* text-gray-400 */
		text-decoration: none;
		transition: all 0.15s ease;
	}

	.pdf-btn-icon:hover {
		background: rgb(243 244 246); /* hover:bg-gray-100 */
		color: rgb(75 85 99); /* hover:text-gray-600 */
	}

	:global(.dark) .pdf-btn-icon:hover {
		background: rgb(31 41 55); /* dark:hover:bg-gray-800 */
		color: rgb(229 231 235); /* dark:hover:text-gray-200 */
	}
</style>
