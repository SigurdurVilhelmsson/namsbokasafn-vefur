<!--
  RatingButtons - the four ratings after a flashcard's answer shows, with each one's next
  interval. One component for /minniskort and /nam's review phase (plan step S4.2, UI-16),
  coloured only through the --rating-* tokens in app.css, whose contrast tokens.test.ts holds
  to AA in both themes.
-->
<script lang="ts">
	import type { DifficultyRating } from '$lib/types/flashcard';

	interface Props {
		/** The next interval for each rating, shown under its label; null hides the line */
		intervals: Record<DifficultyRating, string> | null;
		onrate: (rating: DifficultyRating) => void;
		/** Smaller labels, for /nam's narrower card */
		compact?: boolean;
	}

	let { intervals, onrate, compact = false }: Props = $props();

	const RATINGS: { value: DifficultyRating; label: string }[] = [
		{ value: 'again', label: 'Aftur' },
		{ value: 'hard', label: 'Erfitt' },
		{ value: 'good', label: 'Gott' },
		{ value: 'easy', label: 'Auðvelt' }
	];
</script>

<div class="rating-grid">
	{#each RATINGS as rating (rating.value)}
		<button
			type="button"
			class="rating"
			class:rating--compact={compact}
			class:rating--again={rating.value === 'again'}
			class:rating--hard={rating.value === 'hard'}
			class:rating--good={rating.value === 'good'}
			class:rating--easy={rating.value === 'easy'}
			onclick={() => onrate(rating.value)}
		>
			<span class="rating-label">{rating.label}</span>
			{#if intervals}
				<span class="rating-interval">{intervals[rating.value]}</span>
			{/if}
		</button>
	{/each}
</div>

<style>
	.rating-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.5rem;
	}

	.rating {
		padding: 0.75rem;
		border-radius: var(--radius-lg);
		/* The hover cue is the border, never an opacity fade over the text */
		border: 1px solid transparent;
		transition: border-color 0.15s;
	}

	.rating:hover {
		border-color: currentColor;
	}

	.rating-label {
		display: block;
		font-weight: 500;
	}

	.rating--compact .rating-label {
		font-size: 0.875rem;
	}

	/* No opacity: at 75% the old previews fell to 2.07-3.97:1 */
	.rating-interval {
		display: block;
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.rating--again {
		color: var(--rating-again);
		background-color: var(--rating-again-bg);
	}

	.rating--hard {
		color: var(--rating-hard);
		background-color: var(--rating-hard-bg);
	}

	.rating--good {
		color: var(--rating-good);
		background-color: var(--rating-good-bg);
	}

	.rating--easy {
		color: var(--rating-easy);
		background-color: var(--rating-easy-bg);
	}
</style>
