<script lang="ts">
	/**
	 * Unified icon wrapper (docs/design/icon-guidance-2026-06.md §3).
	 *
	 * Owns the four standard Lucide attributes so stroke/viewBox can't drift, and
	 * the size token so every icon resolves to --icon-sm/md/lg. Components pass a
	 * Lucide `name` + `size`; the glyph is rendered from the bundled registry.
	 *
	 *   <Icon name="search" />                     <!-- default md, decorative -->
	 *   <Icon name="chevron-right" size="sm" />
	 *   <Icon name="x" label="Loka" />             <!-- standalone icon button -->
	 */
	import { getIconNode, resolveIconSize, type IconName, type IconSize } from './icons';

	interface Props {
		name: IconName;
		/** Size step → --icon-sm/md/lg. Default md. */
		size?: IconSize;
		/**
		 * Accessible name. Omit for decorative icons (rendered aria-hidden);
		 * provide for standalone icon buttons/links so they're announced.
		 */
		label?: string;
		/** Extra class(es), e.g. `content-block-icon` for semantic colouring. */
		class?: string;
		/** Inline style, e.g. a dynamic `color:` for per-instance theming. */
		style?: string;
	}

	let { name, size = 'md', label, class: className = '', style }: Props = $props();

	const node = $derived(getIconNode(name));
	const sizeClass = $derived(`ds-icon ds-icon-${resolveIconSize(size)}`);
	const decorative = $derived(label == null);
</script>

{#if node}
	<svg
		class={`${sizeClass} ${className}`.trim()}
		{style}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		role={decorative ? undefined : 'img'}
		aria-hidden={decorative ? 'true' : undefined}
		aria-label={decorative ? undefined : label}
		focusable="false"
	>
		{#each node as [tag, attrs], i (i)}
			<svelte:element this={tag} {...attrs} />
		{/each}
	</svg>
{/if}

<style>
	.ds-icon {
		display: inline-block;
		flex-shrink: 0;
		/* stroke-width is fixed at 2 regardless of size (icon-guidance §1) */
		vertical-align: middle;
	}
	.ds-icon-sm {
		width: var(--icon-sm);
		height: var(--icon-sm);
	}
	.ds-icon-md {
		width: var(--icon-md);
		height: var(--icon-md);
	}
	.ds-icon-lg {
		width: var(--icon-lg);
		height: var(--icon-lg);
	}
</style>
