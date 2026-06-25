<!--
  Procedural book cover (docs/superpowers/specs/2026-06-24-landing-book-covers-design.md).
  Self-contained: gradient from the subject color, a decorative motif watermark, the
  Icelandic title (real text), and the full source attribution. No image / network.
-->
<script lang="ts">
	import type { BookConfig } from '$lib/types/book';
	import { getCoverMotif, coverTitleSize } from './bookCover';

	interface Props {
		book: BookConfig;
		/** Subject-color key → CSS var --subject-{subject} (e.g. 'chemistry'). */
		subject: string;
	}
	let { book, subject }: Props = $props();

	const motif = $derived(getCoverMotif(book.coverMotif));
	const titleSize = $derived(coverTitleSize(book.title));
</script>

<div class="book-cover" style="--cover-c: var(--subject-{subject}, #6b7280)">
	<svg
		class="cover-motif"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="1.5"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
		focusable="false"
	>
		{#each motif as [tag, attrs], i (i)}
			<svelte:element this={tag} {...attrs} />
		{/each}
	</svg>
	<div class="cover-scrim" aria-hidden="true"></div>
	<span class="cover-title" class:long={titleSize === 'long'} aria-hidden="true">{book.title}</span>
	<span class="cover-attr" aria-hidden="true">OpenStax {book.source.title}</span>
</div>

<style>
	.book-cover {
		position: relative;
		aspect-ratio: 2 / 3;
		border-radius: 7px;
		overflow: hidden;
		color: #fff;
		background: linear-gradient(150deg, var(--cover-c), color-mix(in srgb, var(--cover-c) 52%, #0b1f2a));
		box-shadow: var(--shadow-lg);
		font-family: 'Bricolage Grotesque', system-ui, sans-serif;
		/* Make the cover a query container so cover text scales with its OWN width.
		   The landing grid lets covers stretch to full width (1 column) on phones, where
		   a fixed-rem title looked tiny (~6% of cover width vs ~12% on desktop). */
		container-type: inline-size;
	}
	/* left-edge spine highlight */
	.book-cover::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 6px;
		background: linear-gradient(90deg, rgba(0, 0, 0, 0.3), rgba(255, 255, 255, 0.1) 60%, rgba(0, 0, 0, 0));
		z-index: 3;
	}
	/* Dark scrim for WCAG AA contrast — ensures white text passes 4.5:1
	   over all subject colors in both light and dark mode.
	   Darkest at top (title) and bottom (attribution), fades in the middle
	   so the cover color and motif stay visible. */
	.cover-scrim {
		position: absolute;
		inset: 0;
		z-index: 1;
		pointer-events: none;
		background: linear-gradient(
			to bottom,
			rgba(0, 0, 0, 0.55) 0%,
			rgba(0, 0, 0, 0.15) 32%,
			transparent 52%,
			transparent 70%,
			rgba(0, 0, 0, 0.4) 100%
		);
	}
	.cover-motif {
		position: absolute;
		bottom: -36px;
		right: -36px;
		width: 160px;
		height: 160px;
		opacity: 0.2;
		color: #fff;
		/* z-index intentionally not set (auto/0) — stays below cover-scrim */
	}
	.cover-title {
		position: absolute;
		left: 15px;
		right: 13px;
		top: 20px;
		z-index: 2;
		font-weight: 800;
		letter-spacing: -0.02em;
		line-height: 1.05;
		/* Scales with cover width (cqi); clamped so desktop stays ~as before and
		   full-width phone covers don't blow up. */
		font-size: clamp(1.25rem, 12cqi, 2rem);
		overflow-wrap: break-word;
	}
	.cover-title.long {
		font-size: clamp(1.05rem, 10cqi, 1.7rem);
	}
	.cover-attr {
		position: absolute;
		left: 15px;
		right: 13px;
		bottom: 14px;
		z-index: 2;
		font-size: clamp(0.57rem, 5.5cqi, 0.72rem);
		letter-spacing: 0.07em;
		text-transform: uppercase;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.92);
	}
</style>
