<!--
  ReviewPhase - Flashcard review with flip + rate, adapted from minniskort page
-->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { DueFlashcard } from '$lib/utils/studySession';
	import type { PracticeProblem } from '$lib/stores/quiz';
	import type { DifficultyRating } from '$lib/types/flashcard';
	import { flashcardStore } from '$lib/stores/flashcard';
	import { quizStore } from '$lib/stores/quiz';

	export let dueFlashcards: DueFlashcard[];
	export let reviewProblems: PracticeProblem[];

	const dispatch = createEventDispatcher<{ complete: number }>();

	// Combined items: flashcards first, then problems
	type ReviewItem =
		| { type: 'flashcard'; card: DueFlashcard }
		| { type: 'problem'; problem: PracticeProblem };

	const items: ReviewItem[] = [
		...dueFlashcards.map((card): ReviewItem => ({ type: 'flashcard', card })),
		...reviewProblems.map((problem): ReviewItem => ({ type: 'problem', problem }))
	];

	let currentIndex = 0;
	let isFlipped = false;
	let completedCount = 0;

	$: currentItem = items[currentIndex];
	$: total = items.length;
	$: progress = total > 0 ? Math.round((currentIndex / total) * 100) : 0;

	function flip() {
		isFlipped = true;
	}

	function rateFlashcard(rating: DifficultyRating) {
		if (currentItem?.type !== 'flashcard') return;
		flashcardStore.rateCard(currentItem.card.cardId, rating);
		completedCount++;
		advance();
	}

	function rateProblem(success: boolean) {
		if (currentItem?.type !== 'problem') return;
		quizStore.markPracticeProblemAttempt(currentItem.problem.id, success);
		completedCount++;
		advance();
	}

	function advance() {
		if (currentIndex < total - 1) {
			currentIndex++;
			isFlipped = false;
		} else {
			dispatch('complete', completedCount);
		}
	}

	// Preview intervals for flashcards
	$: previewIntervals =
		currentItem?.type === 'flashcard'
			? flashcardStore.getPreviewIntervals(currentItem.card.cardId)
			: null;
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
		<button
			on:click={flip}
			class="rp-card"
		>
			<div class="text-center">
				<span class="rp-card-label">
					{isFlipped ? 'Svar' : 'Spurning'}
				</span>
				<p class="rp-card-text">
					{isFlipped ? currentItem.card.back : currentItem.card.front}
				</p>
			</div>
		</button>

		{#if !isFlipped}
			<p class="rp-hint">
				Smelltu á kortið til að sjá svarið
			</p>
		{:else}
			<div class="mt-4">
				<p class="rp-hint" style="margin-bottom: 0.75rem;">
					Hversu auðvelt var þetta?
				</p>
				<div class="grid grid-cols-4 gap-2">
					<button
						on:click={() => rateFlashcard('again')}
						class="rp-rating rp-rating--again"
					>
						<div class="font-medium text-sm">Aftur</div>
						{#if previewIntervals}
							<div class="text-xs opacity-75">{previewIntervals.again}</div>
						{/if}
					</button>
					<button
						on:click={() => rateFlashcard('hard')}
						class="rp-rating rp-rating--hard"
					>
						<div class="font-medium text-sm">Erfitt</div>
						{#if previewIntervals}
							<div class="text-xs opacity-75">{previewIntervals.hard}</div>
						{/if}
					</button>
					<button
						on:click={() => rateFlashcard('good')}
						class="rp-rating rp-rating--good"
					>
						<div class="font-medium text-sm">Gott</div>
						{#if previewIntervals}
							<div class="text-xs opacity-75">{previewIntervals.good}</div>
						{/if}
					</button>
					<button
						on:click={() => rateFlashcard('easy')}
						class="rp-rating rp-rating--easy"
					>
						<div class="font-medium text-sm">Auðvelt</div>
						{#if previewIntervals}
							<div class="text-xs opacity-75">{previewIntervals.easy}</div>
						{/if}
					</button>
				</div>
			</div>
		{/if}
	{:else if currentItem?.type === 'problem'}
		<!-- Practice problem review -->
		<div class="rp-problem-card">
			<span class="rp-problem-label">
				Æfingadæmi
			</span>
			<div class="prose prose-sm max-w-none dark:prose-invert mb-4" style="color: var(--text-primary);">
				{currentItem.problem.content}
			</div>

			{#if !isFlipped}
				<button
					on:click={flip}
					class="rp-show-answer-btn"
				>
					Sýna svar
				</button>
			{:else}
				<div class="rp-answer-box">
					<h5 class="rp-answer-title">Svar</h5>
					<div class="rp-answer-text">
						{currentItem.problem.answer}
					</div>
				</div>

				<div class="flex gap-3">
					<button
						on:click={() => rateProblem(true)}
						class="rp-assess-btn rp-assess-btn--correct"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						Rétt
					</button>
					<button
						on:click={() => rateProblem(false)}
						class="rp-assess-btn rp-assess-btn--wrong"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
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
		cursor: pointer;
		transition: transform 0.15s;
		text-align: left;
	}
	.rp-card:hover {
		transform: scale(1.01);
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
	/* Rating buttons */
	.rp-rating {
		padding: 0.75rem;
		border-radius: var(--radius-lg);
		transition: opacity 0.15s;
	}
	.rp-rating:hover { opacity: 0.85; }
	.rp-rating--again { background-color: #fef2f2; color: #b91c1c; }
	:global(.dark) .rp-rating--again { background-color: rgba(127,29,29,0.3); color: #fca5a5; }
	.rp-rating--hard { background-color: #fff7ed; color: #c2410c; }
	:global(.dark) .rp-rating--hard { background-color: rgba(124,45,18,0.3); color: #fdba74; }
	.rp-rating--good { background-color: var(--accent-light); color: var(--accent-color); }
	.rp-rating--easy { background-color: #ecfdf5; color: #047857; }
	:global(.dark) .rp-rating--easy { background-color: rgba(6,78,59,0.3); color: #6ee7b7; }

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
		color: var(--accent-color);
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
		color: var(--accent-color);
		transition: opacity 0.15s;
	}
	.rp-show-answer-btn:hover { opacity: 0.85; }
	.rp-answer-box {
		border-radius: var(--radius-lg);
		border: 1px solid #a7f3d0;
		background-color: #ecfdf5;
		padding: 1rem;
		margin-bottom: 1rem;
	}
	:global(.dark) .rp-answer-box {
		border-color: rgba(6,78,59,0.5);
		background-color: rgba(6,78,59,0.2);
	}
	.rp-answer-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: #047857;
		margin-bottom: 0.25rem;
	}
	:global(.dark) .rp-answer-title { color: #34d399; }
	.rp-answer-text {
		font-size: 0.875rem;
		color: #065f46;
	}
	:global(.dark) .rp-answer-text { color: #a7f3d0; }
	.rp-assess-btn {
		display: flex;
		flex: 1;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		border-radius: var(--radius-lg);
		border: 2px solid;
		padding: 0.5rem 1rem;
		font-weight: 500;
		transition: opacity 0.15s;
	}
	.rp-assess-btn:hover { opacity: 0.85; }
	.rp-assess-btn--correct {
		border-color: #86efac;
		background-color: #ecfdf5;
		color: #047857;
	}
	:global(.dark) .rp-assess-btn--correct {
		border-color: rgba(6,78,59,0.5);
		background-color: rgba(6,78,59,0.2);
		color: #34d399;
	}
	.rp-assess-btn--wrong {
		border-color: #fca5a5;
		background-color: #fef2f2;
		color: #b91c1c;
	}
	:global(.dark) .rp-assess-btn--wrong {
		border-color: rgba(127,29,29,0.5);
		background-color: rgba(127,29,29,0.2);
		color: #fca5a5;
	}
</style>
