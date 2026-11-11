<!--
  Button - the one button (plan step SF.2, UI-17), built on M2's tokens (D01):
  - primary: the accent fill with its ink (--on-accent) and the fill's hover, the page's main action;
  - secondary: --bg-secondary with an --border-input edge (3:1, WCAG 1.4.11);
  - ghost: --text-secondary on nothing, --bg-tertiary on hover.
  An <a> when given an href, a <button type="button"> otherwise. Every other attribute
  (onclick, disabled, aria-*, data-*, a class of its own) passes through. A disabled
  button changes colour, never opacity: faded ink on the fill fails (accentText.test.ts).
  The focus ring is app.css's one *:focus-visible rule, so nothing here draws an outline.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'primary' | 'secondary' | 'ghost';
		size?: 'md' | 'lg';
		href?: string;
		class?: string;
		children: Snippet;
		[attribute: string]: unknown;
	}

	let { variant = 'secondary', size = 'md', href, class: className = '', children, ...rest }: Props = $props();
	let classes = $derived(`nb-btn nb-btn-${variant} nb-btn-${size} ${className}`.trim());
</script>

{#if href}
	<a {href} class={classes} {...rest}>{@render children()}</a>
{:else}
	<button type="button" class={classes} {...rest}>{@render children()}</button>
{/if}

<style>
	.nb-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		border: 1px solid transparent;
		border-radius: 0.625rem;
		font-weight: 500;
		text-decoration: none;
		transition:
			background-color 0.15s,
			border-color 0.15s,
			color 0.15s;
	}

	.nb-btn-md {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
	}

	.nb-btn-lg {
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
	}

	.nb-btn-primary {
		background-color: var(--accent-color);
		border-color: var(--accent-color);
		color: var(--on-accent);
	}

	.nb-btn-primary:hover:not(:disabled) {
		background-color: var(--accent-fill-hover);
		border-color: var(--accent-fill-hover);
	}

	.nb-btn-secondary {
		background-color: var(--bg-secondary);
		border-color: var(--border-input);
		color: var(--text-primary);
	}

	.nb-btn-secondary:hover:not(:disabled) {
		background-color: var(--accent-light);
		border-color: var(--accent-strong);
	}

	.nb-btn-ghost {
		background-color: transparent;
		color: var(--text-secondary);
	}

	.nb-btn-ghost:hover:not(:disabled) {
		background-color: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.nb-btn:disabled {
		background-color: var(--bg-tertiary);
		border-color: var(--border-color);
		color: var(--text-disabled);
		cursor: not-allowed;
	}

	@media (prefers-reduced-motion: reduce) {
		.nb-btn {
			transition: none;
		}
	}
</style>
