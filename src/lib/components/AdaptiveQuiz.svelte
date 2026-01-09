<!--
  AdaptiveQuiz - Adaptive quiz component that adjusts difficulty based on mastery
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import { quizStore, type PracticeProblem } from '$lib/stores/quiz';
	import type { MasteryLevel } from '$lib/types/quiz';

	export let chapterSlug: string | undefined = undefined;
	export let onComplete: (() => void) | undefined = undefined;
	export let maxProblems: number = 5;

	interface QuizState {
		currentIndex: number;
		answers: Map<string, boolean>;
		showingAnswer: boolean;
		completed: boolean;
	}

	const MASTERY_LABELS: Record<MasteryLevel, { label: string; color: string; emoji: string }> = {
		novice: { label: 'Nybyrjadur', color: 'text-gray-500', emoji: '🌱' },
		learning: { label: 'Ad laera', color: 'text-amber-500', emoji: '📚' },
		practicing: { label: 'Ad aefa', color: 'text-blue-500', emoji: '💪' },
		proficient: { label: 'God tok', color: 'text-emerald-500', emoji: '🎯' },
		mastered: { label: 'Nad tokum', color: 'text-purple-500', emoji: '🏆' }
	};

	let problems: PracticeProblem[] = [];
	let state: QuizState = {
		currentIndex: 0,
		answers: new Map(),
		showingAnswer: false,
		completed: false
	};

	// Load problems on mount
	onMount(() => {
		const adaptive = quizStore.getAdaptiveProblems(chapterSlug, maxProblems);
		if (adaptive.length === 0) {
			problems = quizStore.getProblemsForReview(maxProblems);
		} else {
			problems = adaptive;
		}
	});

	$: currentProblem = problems[state.currentIndex];
	$: totalProblems = problems.length;
	$: correctCount = Array.from(state.answers.values()).filter(Boolean).length;
	$: incorrectCount = state.answers.size - correctCount;
	$: scorePercentage =
		state.answers.size > 0 ? Math.round((correctCount / state.answers.size) * 100) : 0;

	function handleShowAnswer() {
		state = { ...state, showingAnswer: true };
	}

	function handleAnswer(success: boolean) {
		if (!currentProblem) return;

		// Record the attempt in the store
		quizStore.markPracticeProblemAttempt(currentProblem.id, success);

		// Update local state
		const newAnswers = new Map(state.answers);
		newAnswers.set(currentProblem.id, success);

		// Move to next or complete
		if (state.currentIndex < totalProblems - 1) {
			state = {
				...state,
				answers: newAnswers,
				currentIndex: state.currentIndex + 1,
				showingAnswer: false
			};
		} else {
			state = {
				...state,
				answers: newAnswers,
				completed: true
			};
		}
	}

	function handleRestart() {
		// Reload problems
		const adaptive = quizStore.getAdaptiveProblems(chapterSlug, maxProblems);
		if (adaptive.length === 0) {
			problems = quizStore.getProblemsForReview(maxProblems);
		} else {
			problems = adaptive;
		}

		state = {
			currentIndex: 0,
			answers: new Map(),
			showingAnswer: false,
			completed: false
		};
	}

	function getMasteryInfo(problemId: string) {
		const mastery = quizStore.getProblemMastery(problemId);
		return {
			...mastery,
			...MASTERY_LABELS[mastery.level]
		};
	}
</script>

{#if problems.length === 0}
	<!-- No problems available -->
	<div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
		<svg
			class="mx-auto mb-4 w-12 h-12 text-gray-400"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
			/>
		</svg>
		<h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
			Engin aefingadaemi tiltaek
		</h3>
		<p class="text-sm text-gray-500 dark:text-gray-300">
			Fardu i gegnum efnid og leystu aefingadaemi til ad byrja adlogunarprof.
		</p>
	</div>
{:else if state.completed}
	<!-- Completed state -->
	<div
		class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6"
		transition:fade={{ duration: 200 }}
	>
		<!-- Header -->
		<div class="mb-6 text-center">
			<span class="text-5xl mb-4 block">🏆</span>
			<h3 class="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">Profi lokid!</h3>
			<p class="text-gray-500 dark:text-gray-300">
				Thu hefur lokid vid {totalProblems} daemi
			</p>
		</div>

		<!-- Score -->
		<div class="mb-6 rounded-lg bg-gray-50 dark:bg-gray-900 p-4 text-center">
			<div class="mb-2 text-4xl font-bold text-blue-600 dark:text-blue-400">
				{scorePercentage}%
			</div>
			<div class="flex justify-center gap-4 text-sm">
				<span class="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					{correctCount} rett
				</span>
				<span class="flex items-center gap-1 text-red-600 dark:text-red-400">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					{incorrectCount} rangt
				</span>
			</div>
		</div>

		<!-- Mastery progress -->
		<div class="mb-6 space-y-2">
			<h4 class="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-300">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
					/>
				</svg>
				Framfarir
			</h4>
			<div class="space-y-1">
				{#each problems as problem}
					{@const masteryInfo = getMasteryInfo(problem.id)}
					{@const wasCorrect = state.answers.get(problem.id)}
					<div
						class="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-900 px-3 py-2"
					>
						<span class="flex-1 truncate text-sm text-gray-900 dark:text-gray-100">
							{problem.content.substring(0, 50)}...
						</span>
						<div class="flex items-center gap-2">
							{#if wasCorrect}
								<svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							{:else}
								<svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							{/if}
							<span class="text-xs {masteryInfo.color}">
								{masteryInfo.emoji} {masteryInfo.label}
							</span>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Actions -->
		<div class="flex gap-3">
			<button
				on:click={handleRestart}
				class="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
					/>
				</svg>
				Byrja aftur
			</button>
			{#if onComplete}
				<button
					on:click={onComplete}
					class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
				>
					Loka
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</button>
			{/if}
		</div>
	</div>
{:else}
	<!-- Active quiz state -->
	{@const mastery = currentProblem ? getMasteryInfo(currentProblem.id) : null}
	<div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
		<!-- Header -->
		<div
			class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3"
		>
			<div class="flex items-center gap-2">
				<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
					/>
				</svg>
				<span class="text-sm font-semibold text-gray-900 dark:text-gray-100">Adlogunarprof</span>
			</div>
			<div class="flex items-center gap-3">
				<span class="text-sm text-gray-500 dark:text-gray-300">
					{state.currentIndex + 1} / {totalProblems}
				</span>
				<div class="h-2 w-24 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
					<div
						class="h-full bg-blue-500 transition-all duration-300"
						style="width: {((state.currentIndex + 1) / totalProblems) * 100}%"
					></div>
				</div>
			</div>
		</div>

		<!-- Mastery indicator -->
		{#if mastery}
			<div
				class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-2"
			>
				<div class="flex items-center gap-2 text-sm">
					<svg class="w-4 h-4 {mastery.color}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
						/>
					</svg>
					<span class="{mastery.color}">
						{mastery.emoji} {mastery.label}
					</span>
				</div>
				{#if mastery.attempts > 0}
					<span class="text-xs text-gray-500 dark:text-gray-300">
						{mastery.successRate}% nakvaemni ({mastery.attempts} tilraunir)
					</span>
				{/if}
			</div>
		{/if}

		<!-- Problem content -->
		<div class="p-6">
			<div class="mb-4">
				<h4 class="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-300">
					<svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
						/>
					</svg>
					Daemi {state.currentIndex + 1}
				</h4>
				<div class="prose prose-sm max-w-none dark:prose-invert text-gray-900 dark:text-gray-100">
					{currentProblem?.content}
				</div>
			</div>

			<!-- Answer section -->
			{#if !state.showingAnswer}
				<button
					on:click={handleShowAnswer}
					class="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-500 bg-blue-500/10 px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400 transition-colors hover:bg-blue-500/20"
				>
					Syna svar
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</button>
			{:else}
				<div class="space-y-4" transition:slide={{ duration: 200 }}>
					<!-- Answer -->
					<div
						class="rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-900/20 p-4"
					>
						<h5 class="mb-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">Svar</h5>
						<div class="prose prose-sm max-w-none text-emerald-800 dark:text-emerald-200">
							{currentProblem?.answer}
						</div>
					</div>

					<!-- Self-assessment -->
					<div class="rounded-lg bg-gray-50 dark:bg-gray-900 p-4">
						<p class="mb-3 text-center text-sm text-gray-500 dark:text-gray-300">Hvernig gekk?</p>
						<div class="flex gap-3">
							<button
								on:click={() => handleAnswer(true)}
								class="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 font-medium text-emerald-700 dark:text-emerald-400 transition-all hover:border-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								Rett
							</button>
							<button
								on:click={() => handleAnswer(false)}
								class="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-2 font-medium text-red-700 dark:text-red-400 transition-all hover:border-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								Rangt
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Footer with current score -->
		{#if state.answers.size > 0}
			<div
				class="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-2"
			>
				<span class="text-sm text-gray-500 dark:text-gray-300">Nuverandi einkunn</span>
				<div class="flex items-center gap-2">
					<span class="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						{correctCount}
					</span>
					<span class="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						{incorrectCount}
					</span>
				</div>
			</div>
		{/if}
	</div>
{/if}
