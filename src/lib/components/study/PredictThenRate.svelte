<!--
  PredictThenRate - one flashcard's predict-first round (plan step S4.3, CODE-23): the card,
  'Man það' / 'Man það ekki', then the answer with the prediction echoed and the four ratings.
  One component for /minniskort and /nam's review phase. The parent keys it on the card id,
  so every card starts on its question with no prediction.
-->
<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { DifficultyRating } from '$lib/types/flashcard';
	import { safeSetItem } from '$lib/utils/localStorage';
	import { classifyPrediction } from '$lib/utils/prediction';
	import { announce } from '$lib/stores/announcer';
	import RatingButtons from './RatingButtons.svelte';

	interface Props {
		front: string;
		back: string;
		/** The next interval for each rating; null hides the line */
		intervals: Record<DifficultyRating, string> | null;
		onrate: (rating: DifficultyRating, predictedKnown: boolean) => void;
		/** /nam's smaller card */
		compact?: boolean;
	}

	let { front, back, intervals, onrate, compact = false }: Props = $props();

	// Names the card region after its visible label ('Spurning', then 'Svar')
	const cardLabelId = $props.id();

	let isFlipped = $state(false);
	// Pre-reveal self-prediction (predict-first: judge before seeing the answer)
	let predictedKnown: boolean | null = $state(null);
	let cardEl: HTMLElement | undefined = $state();

	/**
	 * After 'Man það' and a miss, the message comes before the next card (decision D04, PED-20):
	 * the rating waits here, with the answer still showing, until 'Áfram'. What counts as a
	 * miss is classifyPrediction's rule, so 'Að hluta' is one too.
	 */
	// D20: proposed wording (D04, PED-20): the message after a confident miss (D04's draft).
	const CONFIDENT_MISS_MESSAGE = 'Þú hélst að þú myndir þetta — skoðaðu svarið vel.';
	let pendingRating: DifficultyRating | null = $state(null);

	/**
	 * The one-time 'why' line (PED-25): shown on the first card a profile ever sees, until its
	 * first prediction. A per-viewer convenience, so a blocked storage just never shows it.
	 * The key starts with 'namsbokasafn', so 'Eyða öllum gögnum' removes it too.
	 */
	const WHY_SEEN_KEY = 'namsbokasafn:seen-why-predict';
	let showWhy = $state(false);

	onMount(() => {
		try {
			showWhy = localStorage.getItem(WHY_SEEN_KEY) === null;
		} catch {
			showWhy = false;
		}
	});

	/** Focus the card. The parent calls it after a rating, once this is the next card. */
	export function focus() {
		cardEl?.focus();
	}

	async function predictAndFlip(known: boolean) {
		predictedKnown = known;
		isFlipped = true;
		if (showWhy) safeSetItem(WHY_SEEN_KEY, '1');
		// Onto the answer, never a rating button: a held Enter would then rate it 'Rangt'
		await tick();
		cardEl?.focus();
	}

	async function rate(rating: DifficultyRating) {
		if (predictedKnown === null) return;
		if (classifyPrediction({ predictedKnown, rating }) !== 'overconfident') {
			onrate(rating, predictedKnown);
			return;
		}
		pendingRating = rating;
		announce(CONFIDENT_MISS_MESSAGE);
		// Onto the answer, not 'Áfram': a held Enter would otherwise skip the message
		await tick();
		cardEl?.focus();
	}

	function goOn() {
		if (pendingRating === null || predictedKnown === null) return;
		onrate(pendingRating, predictedKnown);
	}
</script>

<!-- Focusable from script only: focus lands here after a prediction and a rating -->
<div
	class="ptr-card"
	class:ptr-card--compact={compact}
	role="region"
	aria-labelledby={cardLabelId}
	tabindex="-1"
	bind:this={cardEl}
>
	<div class="text-center">
		<span id={cardLabelId} class="ptr-card-label">
			{isFlipped ? 'Svar' : 'Spurning'}
		</span>
		<p class="ptr-card-text" class:ptr-card-text--compact={compact}>
			{isFlipped ? back : front}
		</p>
		{#if isFlipped && predictedKnown !== null}
			<!-- D20: proposed wording (PED-20): the prediction echoed on the answer side, 'Þú sagðir: …'. -->
			<p class="ptr-echo">Þú sagðir: {predictedKnown ? 'Man það' : 'Man það ekki'}</p>
		{/if}
	</div>
</div>

{#if !isFlipped}
	<!-- D20: proposed wording (KEEP-02, predict-first): the hint, 'Man það' and 'Man það ekki'. -->
	<div class="ptr-step" class:ptr-step--compact={compact}>
		<p class="ptr-hint">Reyndu fyrst að rifja upp svarið — manstu það?</p>
		{#if showWhy}
			<!-- D20: proposed wording (PED-25): the one-time 'why' line. It claims only what the
			     evidence supports (an answer seen first feels known; a prediction shows what is),
			     never that effort or difficulty means it is working. -->
			<p class="ptr-why">
				Af hverju? Ef þú lítur strax á svarið er auðvelt að halda að þú hafir kunnað það. Þegar þú
				spáir fyrst sérðu hvað þú kannt í raun.
			</p>
		{/if}
		<div class="grid grid-cols-2 gap-2">
			<button type="button" onclick={() => predictAndFlip(true)} class="ptr-predict">
				Man það
			</button>
			<button type="button" onclick={() => predictAndFlip(false)} class="ptr-predict">
				Man það ekki
			</button>
		</div>
	</div>
{:else if pendingRating !== null}
	<div class="ptr-step" class:ptr-step--compact={compact}>
		<p class="ptr-miss">{CONFIDENT_MISS_MESSAGE}</p>
		<div class="flex justify-center">
			<!-- D20: proposed wording (D04, PED-20): 'Áfram', which records the rating and moves on. -->
			<button type="button" onclick={goOn} class="ptr-predict ptr-goon">Áfram</button>
		</div>
	</div>
{:else}
	<div class="ptr-step" class:ptr-step--compact={compact}>
		<!-- D20: proposed wording (D04, PED-08): the hint that asks for correctness, not ease. -->
		<p class="ptr-hint">Berðu saman við svarið: hafðirðu rétt fyrir þér?</p>
		<RatingButtons {intervals} onrate={rate} {compact} />
	</div>
{/if}

<style>
	.ptr-card {
		width: 100%;
		min-height: 300px;
		padding: 2rem;
		border-radius: var(--radius-xl);
		background-color: var(--bg-secondary);
		box-shadow: var(--shadow-lg);
		border: 1px solid var(--border-color);
		text-align: left;
	}
	.ptr-card--compact {
		min-height: 250px;
		padding: 1.5rem;
	}
	.ptr-card-label {
		display: block;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-tertiary);
		margin-bottom: 1rem;
	}
	.ptr-card-text {
		font-size: 1.25rem;
		color: var(--text-primary);
	}
	.ptr-card-text--compact {
		font-size: 1.125rem;
	}
	.ptr-echo {
		margin-top: 1rem;
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.ptr-step {
		margin-top: 1.5rem;
	}
	.ptr-step--compact {
		margin-top: 1rem;
	}
	.ptr-hint {
		text-align: center;
		font-size: 0.875rem;
		color: var(--text-tertiary);
		margin-bottom: 1rem;
	}
	.ptr-step--compact .ptr-hint {
		margin-bottom: 0.75rem;
	}
	.ptr-why {
		text-align: center;
		font-size: 0.875rem;
		color: var(--text-secondary);
		margin-bottom: 1rem;
	}

	.ptr-miss {
		text-align: center;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary);
		margin-bottom: 1rem;
	}
	.ptr-goon {
		min-width: 8rem;
	}

	.ptr-predict {
		padding: 0.75rem;
		border-radius: 0.75rem;
		border: 1px solid var(--border-color);
		background-color: var(--bg-secondary);
		color: var(--text-primary);
		font-weight: 500;
		transition: all 0.15s;
	}
	.ptr-step--compact .ptr-predict {
		padding: 0.625rem;
		border-radius: 0.625rem;
	}
	.ptr-predict:hover {
		border-color: var(--accent-color);
		background-color: var(--accent-light);
	}
</style>
