<!--
  SegmentedControl: one choice among a few, on native radio buttons (plan step S11.3, register
  UI-03). The fieldset names the group, and each option is a radio, so a screen reader hears the
  group, the option and whether it is chosen; Tab enters the group once and the arrow keys
  choose. Each radio is transparent and covers its segment, so app.css's one focus ring
  (*:focus-visible) draws around the segment, with no focus rule of its own. The chosen segment
  carries a check as well as the fill, so its state is not colour alone.
-->
<script lang="ts" generics="T extends string">
	import Icon from '$lib/components/Icon.svelte';

	interface Option {
		value: T;
		label: string;
	}

	interface Props {
		legend: string;
		/** The radios' group name: unique on the page */
		name: string;
		options: readonly Option[];
		value: T;
		onchange: (value: T) => void;
		/** 'block' for Settings' rows, 'inline' for the reading view's compact pair */
		variant?: 'block' | 'inline';
		/** Where the context shows what the group is, the legend is for screen readers only */
		legendHidden?: boolean;
	}

	let { legend, name, options, value, onchange, variant = 'block', legendHidden = false }: Props = $props();

	const inputs: Partial<Record<T, HTMLInputElement>> = {};

	/** Focus one option's radio, without scrolling to it */
	export function focus(option: T) {
		inputs[option]?.focus({ preventScroll: true });
	}
</script>

<fieldset class="segmented segmented-{variant}">
	<legend class={legendHidden ? 'sr-only' : 'segmented-legend'}>{legend}</legend>
	<div class="segmented-options">
		{#each options as option (option.value)}
			{@const checked = option.value === value}
			<label class="segment" class:segment-checked={checked}>
				<input
					bind:this={inputs[option.value]}
					type="radio"
					{name}
					value={option.value}
					{checked}
					onchange={() => onchange(option.value)}
				/>
				{#if checked}<Icon name="check" size="sm" />{/if}
				<span>{option.label}</span>
			</label>
		{/each}
	</div>
</fieldset>

<style>
	.segmented {
		min-width: 0;
	}

	.segmented-legend {
		display: block;
		margin-bottom: 0.75rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary);
	}

	.segment {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color 150ms,
			color 150ms;
	}

	/* The radio covers its segment, unseen: its box is where the global focus ring draws */
	.segment input {
		position: absolute;
		inset: 0;
		margin: 0;
		appearance: none;
		background: transparent;
		border: 0;
		border-radius: inherit;
		cursor: pointer;
	}

	/* Settings' rows: three across on a phone, side by side from 640 px */
	.segmented-block .segmented-options {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.5rem;
	}
	@media (min-width: 640px) {
		.segmented-block .segmented-options {
			display: flex;
		}
	}
	.segmented-block .segment {
		flex: 1 1 0%;
		border-radius: 0.5rem;
		padding: 0.625rem 0.75rem;
		background: var(--bg-secondary);
		color: var(--text-secondary);
	}
	.segmented-block .segment:hover {
		background: var(--bg-tertiary);
	}
	.segmented-block .segment-checked,
	.segmented-block .segment-checked:hover {
		background: var(--accent-color);
		color: var(--on-accent);
		box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
	}

	/* The reading view's pair: one bordered pill */
	.segmented-inline .segmented-options {
		display: inline-flex;
		gap: 0.125rem;
		border: 1px solid var(--border-color);
		border-radius: 0.5rem;
		padding: 0.125rem;
	}
	.segmented-inline .segment {
		border-radius: 0.375rem;
		padding: 0.25rem 0.75rem;
		color: var(--text-secondary);
	}
	.segmented-inline .segment:hover {
		background: var(--accent-subtle);
	}
	.segmented-inline .segment-checked,
	.segmented-inline .segment-checked:hover {
		background: var(--accent-color);
		color: var(--on-accent);
	}
</style>
