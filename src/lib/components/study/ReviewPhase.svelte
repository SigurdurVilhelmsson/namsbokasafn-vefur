<!--
  ReviewPhase - Flashcard review (predict, reveal, rate), adapted from minniskort page
-->
<script lang="ts">
	import type { DueFlashcard } from '$lib/utils/studySession';
	import Icon from '$lib/components/Icon.svelte';
	import type { PracticeProblem } from '$lib/stores/quiz';
	import type { DifficultyRating } from '$lib/types/flashcard';
	import { flashcardStore } from '$lib/stores/flashcard';
	import { quizStore } from '$lib/stores/quiz';
	import PracticeSnapshot from '$lib/components/PracticeSnapshot.svelte';
	import { storedAnswerText } from '$lib/utils/practiceSnapshot';
	import RatingButtons from './RatingButtons.svelte';
	import { announce } from '$lib/stores/announcer';
	import { tick } from 'svelte';

	interface Props {
		dueFlashcards: DueFlashcard[];
		reviewProblems: PracticeProblem[];
		oncomplete?: (count: number) => void;
	}

	let { dueFlashcards, reviewProblems, oncomplete }: Props = $props();

	// Names the card region after its visible label ('Spurning', then 'Svar')
	const cardLabelId = $props.id();
	const problemLabelId = `${cardLabelId}-problem`;

	// Combined items: flashcards first, then problems
	type ReviewItem =
		| { type: 'flashcard'; card: DueFlashcard }
		| { type: 'problem'; problem: PracticeProblem };

	let items = $derived<ReviewItem[]>([
		...dueFlashcards.map((card): ReviewItem => ({ type: 'flashcard', card })),
		...reviewProblems.map((problem): ReviewItem => ({ type: 'problem', problem }))
	]);

	let currentIndex = $state(0);
	let isFlipped = $state(false);
	// Pre-reveal self-prediction (predict-first: judge before seeing the answer)
	let predictedKnown: boolean | null = $state(null);
	let completedCount = $state(0);

	let currentItem = $derived(items[currentIndex]);
	let total = $derived(items.length);
	let progress = $derived(total > 0 ? Math.round((currentIndex / total) * 100) : 0);

	// Where focus goes when the control that had it disappears (plan step S4.2, UI-01)
	let cardEl: HTMLElement | undefined = $state();
	let problemEl: HTMLElement | undefined = $state();
	let answerEl: HTMLElement | undefined = $state();

	async function predictAndFlip(known: boolean) {
		predictedKnown = known;
		isFlipped = true;
		// Onto the answer, never a rating button: a held Enter would then rate it 'Aftur'
		await tick();
		cardEl?.focus();
	}

	// Practice problems reveal directly; they have their own self-assessment
	async function revealAnswer() {
		isFlipped = true;
		await tick();
		answerEl?.focus();
	}

	function rateFlashcard(rating: DifficultyRating) {
		if (currentItem?.type !== 'flashcard') return;
		flashcardStore.rateCard(currentItem.card.cardId, rating, predictedKnown ?? undefined);
		completedCount++;
		advance();
	}

	function rateProblem(success: boolean) {
		if (currentItem?.type !== 'problem') return;
		quizStore.markPracticeProblemAttempt(currentItem.problem.id, success);
		completedCount++;
		advance();
	}

	async function advance() {
		if (currentIndex < total - 1) {
			currentIndex++;
			isFlipped = false;
			predictedKnown = null;
			// Onto the next card's question or problem, and say where in the set it is
			await tick();
			(currentItem?.type === 'problem' ? problemEl : cardEl)?.focus();
			announce(`${currentIndex + 1} af ${total}`);
		} else {
			oncomplete?.(completedCount);
		}
	}

	// Preview intervals for flashcards
	let previewIntervals = $derived(
		currentItem?.type === 'flashcard'
			? flashcardStore.getPreviewIntervals(currentItem.card.cardId)
			: null
	);
</script>

<div>
	<h2 class="rp-heading">
		Endurtekningar
	</h2>
	<p class="rp-description">
		Farðu yfir kort og dæmi sem þarfnast endurtekningar.
	</p>

	<!-- Progress bar -->
	<div class="mb-4">
		<div class="rp-progress-text">
			<span>{currentIndex + 1} af {total}</span>
			<span>{progress}%</span>
		</div>
		<div class="rp-progress-track">
			<div
				class="rp-progress-fill"
				style="width: {progress}%"
			></div>
		</div>
	</div>

	{#if currentItem?.type === 'flashcard'}
		<!-- Flashcard review -->
		<!-- Focusable from script only: focus lands here after a prediction and a rating -->
		<div class="rp-card" role="region" aria-labelledby={cardLabelId} tabindex="-1" bind:this={cardEl}>
			<div class="text-center">
				<span id={cardLabelId} class="rp-card-label">
					{isFlipped ? 'Svar' : 'Spurning'}
				</span>
				<p class="rp-card-text">
					{isFlipped ? currentItem.card.back : currentItem.card.front}
				</p>
				{#if isFlipped && predictedKnown !== null}
					<!-- D20: proposed wording (PED-20): the prediction echoed on the answer side, 'Þú sagðir: …'. -->
					<p class="rp-echo">Þú sagðir: {predictedKnown ? 'Man það' : 'Man það ekki'}</p>
				{/if}
			</div>
		</div>

		{#if !isFlipped}
			<!-- D20: proposed wording (KEEP-02, predict-first): the hint, 'Man það' and 'Man það ekki'. -->
			<div class="mt-4">
				<p class="rp-hint" style="margin-bottom: 0.75rem;">
					Reyndu fyrst að rifja upp svarið — manstu það?
				</p>
				<div class="grid grid-cols-2 gap-2">
					<button onclick={() => predictAndFlip(true)} class="rp-predict">
						Man það
					</button>
					<button onclick={() => predictAndFlip(false)} class="rp-predict">
						Man það ekki
					</button>
				</div>
			</div>
		{:else}
			<div class="mt-4">
				<p class="rp-hint" style="margin-bottom: 0.75rem;">
					Hversu auðvelt var þetta?
				</p>
				<RatingButtons intervals={previewIntervals} onrate={rateFlashcard} compact />
			</div>
		{/if}
	{:else if currentItem?.type === 'problem'}
		<!-- Practice problem review -->
		<div class="rp-problem-card" role="region" aria-labelledby={problemLabelId} tabindex="-1" bind:this={problemEl}>
			<span id={problemLabelId} class="rp-problem-label">
				Æfingadæmi
			</span>
			<div class="mb-4" style="color: var(--text-primary);">
				<PracticeSnapshot html={currentItem.problem.contentHtml} text={currentItem.problem.content} />
			</div>

			{#if !isFlipped}
				<button
					onclick={revealAnswer}
					class="rp-show-answer-btn"
				>
					Sýna svar
				</button>
			{:else}
				<div class="rp-answer-box" tabindex="-1" bind:this={answerEl}>
					<h5 class="rp-answer-title">Svar</h5>
					<div class="rp-answer-text">
						<PracticeSnapshot html={currentItem.problem.answerHtml} text={storedAnswerText(currentItem.problem.answer)} />
					</div>
				</div>

				<div class="flex gap-3">
					<button
						onclick={() => rateProblem(true)}
						class="rp-assess-btn rp-assess-btn--correct"
					>
						<Icon name="circle-check" />
						Rétt
					</button>
					<button
						onclick={() => rateProblem(false)}
						class="rp-assess-btn rp-assess-btn--wrong"
					>
						<Icon name="circle-x" />
						Rangt
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.rp-heading {
		font-family: "Bricolage Grotesque", system-ui, sans-serif;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 0.25rem;
	}
	.rp-description {
		font-size: 0.875rem;
		color: var(--text-secondary);
		margin-bottom: 1rem;
	}
	.rp-progress-text {
		display: flex;
		justify-content: space-between;
		font-size: 0.875rem;
		color: var(--text-tertiary);
		margin-bottom: 0.25rem;
	}
	.rp-progress-track {
		height: 0.5rem;
		border-radius: 9999px;
		background-color: var(--bg-tertiary);
	}
	.rp-progress-fill {
		height: 100%;
		border-radius: 9999px;
		background-color: var(--accent-color);
		transition: width 0.3s;
	}
	.rp-card {
		width: 100%;
		min-height: 250px;
		padding: 1.5rem;
		border-radius: var(--radius-xl);
		background-color: var(--bg-secondary);
		box-shadow: var(--shadow-lg);
		border: 1px solid var(--border-color);
		text-align: left;
	}
	.rp-echo {
		margin-top: 0.75rem;
		font-size: 0.875rem;
		color: var(--text-secondary);
	}
	.rp-card-label {
		display: block;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-tertiary);
		margin-bottom: 1rem;
	}
	.rp-card-text {
		font-size: 1.125rem;
		color: var(--text-primary);
	}
	.rp-hint {
		text-align: center;
		font-size: 0.875rem;
		color: var(--text-tertiary);
		margin-top: 0.75rem;
	}
	.rp-predict {
		padding: 0.625rem;
		border-radius: 0.625rem;
		border: 1px solid var(--border-color);
		background-color: var(--bg-secondary);
		color: var(--text-primary);
		font-weight: 500;
		transition: all 0.15s;
	}
	.rp-predict:hover {
		border-color: var(--accent-color);
		background-color: var(--accent-light);
	}

	/* Problem card */
	.rp-problem-card {
		border-radius: var(--radius-xl);
		background-color: var(--bg-secondary);
		box-shadow: var(--shadow-lg);
		border: 1px solid var(--border-color);
		padding: 1.5rem;
	}
	.rp-problem-label {
		display: block;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--accent-strong);
		margin-bottom: 0.75rem;
	}
	.rp-show-answer-btn {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		border-radius: var(--radius-lg);
		border: 1px solid var(--accent-color);
		background-color: var(--accent-light);
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--accent-strong);
		transition: background-color 0.15s;
	}
	/* A tint, not an opacity fade: faded --accent-strong drops below 4.5:1. */
	.rp-show-answer-btn:hover { background-color: var(--accent-subtle); }
	/* The answer and the self-assessment use the rating tokens (S4.2, UI-16): green for the
	   answer and 'Rétt', red for 'Rangt', with no hex colours and no opacity fade on text. */
	.rp-answer-box {
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-color);
		background-color: var(--rating-easy-bg);
		padding: 1rem;
		margin-bottom: 1rem;
	}
	.rp-answer-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--rating-easy);
		margin-bottom: 0.25rem;
	}
	.rp-answer-text {
		font-size: 0.875rem;
		color: var(--text-primary);
	}
	.rp-assess-btn {
		display: flex;
		flex: 1;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		border-radius: var(--radius-lg);
		border: 2px solid transparent;
		padding: 0.5rem 1rem;
		font-weight: 500;
		transition: border-color 0.15s;
	}
	.rp-assess-btn:hover {
		border-color: currentColor;
	}
	.rp-assess-btn--correct {
		background-color: var(--rating-easy-bg);
		color: var(--rating-easy);
	}
	.rp-assess-btn--wrong {
		background-color: var(--rating-again-bg);
		color: var(--rating-again);
	}
</style>
