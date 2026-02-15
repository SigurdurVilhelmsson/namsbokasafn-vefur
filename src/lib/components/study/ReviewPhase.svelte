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
	<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
		Endurtekningar
	</h2>
	<p class="text-sm text-gray-500 dark:text-gray-300 mb-4">
		Farðu yfir kort og dæmi sem þarfnast endurtekningar.
	</p>

	<!-- Progress bar -->
	<div class="mb-4">
		<div class="flex justify-between text-sm text-gray-500 dark:text-gray-300 mb-1">
			<span>{currentIndex + 1} af {total}</span>
			<span>{progress}%</span>
		</div>
		<div class="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
			<div
				class="h-full rounded-full bg-orange-500 transition-all duration-300"
				style="width: {progress}%"
			></div>
		</div>
	</div>

	{#if currentItem?.type === 'flashcard'}
		<!-- Flashcard review -->
		<button
			on:click={flip}
			class="w-full min-h-[250px] p-6 rounded-2xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 cursor-pointer transition-transform hover:scale-[1.01] text-left"
		>
			<div class="text-center">
				<span class="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4 block">
					{isFlipped ? 'Svar' : 'Spurning'}
				</span>
				<p class="text-lg text-gray-900 dark:text-gray-100">
					{isFlipped ? currentItem.card.back : currentItem.card.front}
				</p>
			</div>
		</button>

		{#if !isFlipped}
			<p class="text-center text-sm text-gray-500 dark:text-gray-300 mt-3">
				Smelltu á kortið til að sjá svarið
			</p>
		{:else}
			<div class="mt-4">
				<p class="text-center text-sm text-gray-500 dark:text-gray-300 mb-3">
					Hversu auðvelt var þetta?
				</p>
				<div class="grid grid-cols-4 gap-2">
					<button
						on:click={() => rateFlashcard('again')}
						class="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
					>
						<div class="font-medium text-sm">Aftur</div>
						{#if previewIntervals}
							<div class="text-xs opacity-75">{previewIntervals.again}</div>
						{/if}
					</button>
					<button
						on:click={() => rateFlashcard('hard')}
						class="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
					>
						<div class="font-medium text-sm">Erfitt</div>
						{#if previewIntervals}
							<div class="text-xs opacity-75">{previewIntervals.hard}</div>
						{/if}
					</button>
					<button
						on:click={() => rateFlashcard('good')}
						class="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
					>
						<div class="font-medium text-sm">Gott</div>
						{#if previewIntervals}
							<div class="text-xs opacity-75">{previewIntervals.good}</div>
						{/if}
					</button>
					<button
						on:click={() => rateFlashcard('easy')}
						class="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
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
		<div class="rounded-2xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 p-6">
			<span class="text-xs font-medium uppercase tracking-wider text-purple-500 mb-3 block">
				Æfingadæmi
			</span>
			<div class="prose prose-sm max-w-none dark:prose-invert text-gray-900 dark:text-gray-100 mb-4">
				{currentItem.problem.content}
			</div>

			{#if !isFlipped}
				<button
					on:click={flip}
					class="w-full flex items-center justify-center gap-2 rounded-lg border border-blue-500 bg-blue-500/10 px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400 transition-colors hover:bg-blue-500/20"
				>
					Sýna svar
				</button>
			{:else}
				<div class="rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-900/20 p-4 mb-4">
					<h5 class="mb-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">Svar</h5>
					<div class="prose prose-sm max-w-none text-emerald-800 dark:text-emerald-200">
						{currentItem.problem.answer}
					</div>
				</div>

				<div class="flex gap-3">
					<button
						on:click={() => rateProblem(true)}
						class="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 font-medium text-emerald-700 dark:text-emerald-400 transition-all hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						Rétt
					</button>
					<button
						on:click={() => rateProblem(false)}
						class="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-2 font-medium text-red-700 dark:text-red-400 transition-all hover:bg-red-100 dark:hover:bg-red-900/30"
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
