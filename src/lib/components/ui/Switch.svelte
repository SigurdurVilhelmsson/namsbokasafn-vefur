<!--
  Switch - a button with role="switch" (plan step SF.2, UI-17). The caller owns the state:
  `checked` sets aria-checked, and `onchange` is called on a press.

  Every state pair reaches 3:1 in both themes (WCAG 1.4.11; e2e/ui-primitives.spec.ts), on
  tokens tokens.test.ts already holds there:
  - off: an --border-input track (3:1 on the page and the dialog) with an --focus-gap knob;
  - on: an --focus-ring track, the colour native radios use (bronze in light, amber in dark),
    with the same --focus-gap knob (white in light, ink in dark), so the knob takes its own
    colour per theme. The amber fill was 2.92:1 against a light dialog.
  The focus ring is app.css's one *:focus-visible rule, so nothing here draws an outline.
-->
<script lang="ts">
	interface Props {
		checked: boolean;
		onchange: () => void;
		[attribute: string]: unknown;
	}

	let { checked, onchange, ...rest }: Props = $props();
</script>

<button type="button" role="switch" aria-checked={checked} class="nb-switch" class:nb-switch-on={checked} onclick={onchange} {...rest}>
	<span class="nb-switch-knob"></span>
</button>

<style>
	.nb-switch {
		position: relative;
		display: inline-flex;
		flex-shrink: 0;
		align-items: center;
		width: 2.75rem;
		height: 1.5rem;
		border-radius: 9999px;
		background-color: var(--border-input);
		transition: background-color 0.15s;
	}

	.nb-switch-on {
		background-color: var(--focus-ring);
	}

	.nb-switch-knob {
		display: inline-block;
		width: 1rem;
		height: 1rem;
		border-radius: 9999px;
		background-color: var(--focus-gap);
		box-shadow: var(--shadow-sm);
		transform: translateX(0.25rem);
		transition: transform 0.15s;
	}

	.nb-switch-on .nb-switch-knob {
		transform: translateX(1.5rem);
	}

	@media (prefers-reduced-motion: reduce) {
		.nb-switch,
		.nb-switch-knob {
			transition: none;
		}
	}
</style>
