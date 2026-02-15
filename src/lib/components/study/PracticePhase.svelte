<!--
  PracticePhase - Wraps AdaptiveQuiz for practice problems within the session
-->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { PracticeProblem } from '$lib/stores/quiz';
	import { quizStore } from '$lib/stores/quiz';

	export let problems: PracticeProblem[];

	const dispatch = createEventDispatcher<{ complete: number }>();

	let currentIndex = 0;
	let isShowingAnswer = false;
	let completedCount = 0;

	$: currentProblem = problems[currentIndex];
	$: total = problems.length;
	$: progress = total > 0 ? Math.round((currentIndex / total) * 100) : 0;

	function showAnswer() {
		isShowingAnswer = true;
	}

	function handleAnswer(success: boolean) {
		if (!currentProblem) return;
		quizStore.markPracticeProblemAttempt(currentProblem.id, success);
		completedCount++;

		if (currentIndex < total - 1) {
			currentIndex++;
			isShowingAnswer = false;
		} else {
			dispatch('complete', completedCount);
		}
	}
</script>

<div>
	<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
		Æfingar
	</h2>
	<p class="text-sm text-gray-500 dark:text-gray-300 mb-4">
		Leystu dæmi til að styrkja skilninginn.
	</p>

	<!-- Progress bar -->
	<div class="mb-4">
		<div class="flex justify-between text-sm text-gray-500 dark:text-gray-300 mb-1">
			<span>Dæmi {currentIndex + 1} af {total}</span>
			<span>{progress}%</span>
		</div>
		<div class="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
			<div
				class="h-full rounded-full bg-purple-500 transition-all duration-300"
				style="width: {progress}%"
			></div>
		</div>
	</div>

	{#if currentProblem}
		<div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
			<div class="mb-4">
				<h4 class="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-300">
					<svg class="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
					</svg>
					Dæmi {currentIndex + 1}
				</h4>
				<div class="prose prose-sm max-w-none dark:prose-invert text-gray-900 dark:text-gray-100">
					{currentProblem.content}
				</div>
			</div>

			{#if !isShowingAnswer}
				<button
					on:click={showAnswer}
					class="w-full flex items-center justify-center gap-2 rounded-lg border border-purple-500 bg-purple-500/10 px-4 py-3 text-sm font-medium text-purple-600 dark:text-purple-400 transition-colors hover:bg-purple-500/20"
				>
					Sýna svar
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</button>
			{:else}
				<div class="space-y-4">
					<div class="rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-900/20 p-4">
						<h5 class="mb-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">Svar</h5>
						<div class="prose prose-sm max-w-none text-emerald-800 dark:text-emerald-200">
							{currentProblem.answer}
						</div>
					</div>

					<div class="rounded-lg bg-gray-50 dark:bg-gray-900 p-4">
						<p class="mb-3 text-center text-sm text-gray-500 dark:text-gray-300">Hvernig gekk?</p>
						<div class="flex gap-3">
							<button
								on:click={() => handleAnswer(true)}
								class="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 font-medium text-emerald-700 dark:text-emerald-400 transition-all hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								Rétt
							</button>
							<button
								on:click={() => handleAnswer(false)}
								class="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-2 font-medium text-red-700 dark:text-red-400 transition-all hover:bg-red-100 dark:hover:bg-red-900/30"
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								Rangt
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
