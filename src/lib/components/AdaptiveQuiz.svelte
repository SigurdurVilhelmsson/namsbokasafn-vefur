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

	const MASTERY_LABELS: Record<MasteryLevel, { label: string; cssClass: string; emoji: string }> = {
		novice: { label: 'Nybyrjadur', cssClass: 'aq-mastery--novice', emoji: '🌱' },
		learning: { label: 'Ad laera', cssClass: 'aq-mastery--learning', emoji: '📚' },
		practicing: { label: 'Ad aefa', cssClass: 'aq-mastery--practicing', emoji: '💪' },
		proficient: { label: 'God tok', cssClass: 'aq-mastery--proficient', emoji: '🎯' },
		mastered: { label: 'Nad tokum', cssClass: 'aq-mastery--mastered', emoji: '🏆' }
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
		const labels = MASTERY_LABELS[mastery.level];
		return {
			...mastery,
			label: labels.label,
			cssClass: labels.cssClass,
			emoji: labels.emoji
		};
	}
</script>

{#if problems.length === 0}
	<!-- No problems available -->
	<div class="aq-card aq-card--empty">
		<svg
			class="mx-auto mb-4 w-12 h-12"
			style="color: var(--text-tertiary);"
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
		<h3 class="aq-empty-title">
			Engin aefingadaemi tiltaek
		</h3>
		<p class="aq-empty-text">
			Fardu i gegnum efnid og leystu aefingadaemi til ad byrja adlogunarprof.
		</p>
	</div>
{:else if state.completed}
	<!-- Completed state -->
	<div class="aq-card" transition:fade={{ duration: 200 }}>
		<!-- Header -->
		<div class="mb-6 text-center">
			<span class="text-5xl mb-4 block">🏆</span>
			<h3 class="aq-complete-title">Profi lokid!</h3>
			<p class="aq-complete-text">
				Thu hefur lokid vid {totalProblems} daemi
			</p>
		</div>

		<!-- Score -->
		<div class="aq-score-box">
			<div class="aq-score-value">
				{scorePercentage}%
			</div>
			<div class="flex justify-center gap-4 text-sm">
				<span class="aq-correct-indicator">
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
				<span class="aq-wrong-indicator">
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
			<h4 class="aq-section-title">
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
					<div class="aq-progress-row">
						<span class="aq-progress-label">
							{problem.content.substring(0, 50)}...
						</span>
						<div class="flex items-center gap-2">
							{#if wasCorrect}
								<svg class="w-4 h-4 aq-icon-correct" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							{:else}
								<svg class="w-4 h-4 aq-icon-wrong" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							{/if}
							<span class="text-xs {masteryInfo.cssClass}">
								{masteryInfo.emoji} {masteryInfo.label}
							</span>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Actions -->
		<div class="flex gap-3">
			<button on:click={handleRestart} class="aq-secondary-btn">
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
				<button on:click={onComplete} class="aq-primary-btn">
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
	<div class="aq-card aq-card--no-pad">
		<!-- Header -->
		<div class="aq-header">
			<div class="flex items-center gap-2">
				<svg class="w-5 h-5" style="color: var(--accent-color);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
					/>
				</svg>
				<span class="text-sm font-semibold" style="color: var(--text-primary);">Adlogunarprof</span>
			</div>
			<div class="flex items-center gap-3">
				<span class="text-sm" style="color: var(--text-tertiary);">
					{state.currentIndex + 1} / {totalProblems}
				</span>
				<div class="aq-progress-track">
					<div
						class="aq-progress-fill"
						style="width: {((state.currentIndex + 1) / totalProblems) * 100}%"
					></div>
				</div>
			</div>
		</div>

		<!-- Mastery indicator -->
		{#if mastery}
			<div class="aq-mastery-bar">
				<div class="flex items-center gap-2 text-sm">
					<svg class="w-4 h-4 {mastery.cssClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
						/>
					</svg>
					<span class="{mastery.cssClass}">
						{mastery.emoji} {mastery.label}
					</span>
				</div>
				{#if mastery.attempts > 0}
					<span class="text-xs" style="color: var(--text-tertiary);">
						{mastery.successRate}% nakvaemni ({mastery.attempts} tilraunir)
					</span>
				{/if}
			</div>
		{/if}

		<!-- Problem content -->
		<div class="p-6">
			<div class="mb-4">
				<h4 class="aq-problem-label">
					<svg class="w-4 h-4" style="color: var(--accent-color);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
						/>
					</svg>
					Daemi {state.currentIndex + 1}
				</h4>
				<div class="prose prose-sm max-w-none dark:prose-invert" style="color: var(--text-primary);">
					{currentProblem?.content}
				</div>
			</div>

			<!-- Answer section -->
			{#if !state.showingAnswer}
				<button on:click={handleShowAnswer} class="aq-show-answer-btn">
					Syna svar
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</button>
			{:else}
				<div class="space-y-4" transition:slide={{ duration: 200 }}>
					<!-- Answer -->
					<div class="aq-answer-box">
						<h5 class="aq-answer-title">Svar</h5>
						<div class="aq-answer-text">
							{currentProblem?.answer}
						</div>
					</div>

					<!-- Self-assessment -->
					<div class="aq-assess-area">
						<p class="aq-assess-prompt">Hvernig gekk?</p>
						<div class="flex gap-3">
							<button
								on:click={() => handleAnswer(true)}
								class="aq-assess-btn aq-assess-btn--correct"
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
								class="aq-assess-btn aq-assess-btn--wrong"
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
			<div class="aq-footer">
				<span class="text-sm" style="color: var(--text-tertiary);">Nuverandi einkunn</span>
				<div class="flex items-center gap-2">
					<span class="aq-correct-indicator text-sm">
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
					<span class="aq-wrong-indicator text-sm">
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

<style>
	/* Card wrapper */
	.aq-card {
		border-radius: var(--radius-xl);
		border: 1px solid var(--border-color);
		background-color: var(--bg-secondary);
		padding: 1.5rem;
	}
	.aq-card--no-pad {
		padding: 0;
	}
	.aq-card--empty {
		padding: 2rem;
		text-align: center;
	}

	/* Empty state */
	.aq-empty-title {
		font-family: "Bricolage Grotesque", system-ui, sans-serif;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
	}
	.aq-empty-text {
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	/* Complete state */
	.aq-complete-title {
		font-family: "Bricolage Grotesque", system-ui, sans-serif;
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
	}
	.aq-complete-text {
		color: var(--text-secondary);
	}

	/* Score box */
	.aq-score-box {
		margin-bottom: 1.5rem;
		border-radius: var(--radius-lg);
		background-color: var(--bg-tertiary);
		padding: 1rem;
		text-align: center;
	}
	.aq-score-value {
		font-size: 2.25rem;
		font-weight: 700;
		color: var(--accent-color);
		margin-bottom: 0.5rem;
	}

	/* Indicators */
	.aq-correct-indicator {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		color: #059669;
	}
	:global(.dark) .aq-correct-indicator { color: #34d399; }
	.aq-wrong-indicator {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		color: #dc2626;
	}
	:global(.dark) .aq-wrong-indicator { color: #f87171; }
	.aq-icon-correct { color: #059669; }
	:global(.dark) .aq-icon-correct { color: #34d399; }
	.aq-icon-wrong { color: #dc2626; }
	:global(.dark) .aq-icon-wrong { color: #f87171; }

	/* Section title */
	.aq-section-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	/* Progress row */
	.aq-progress-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-radius: var(--radius-lg);
		background-color: var(--bg-tertiary);
		padding: 0.5rem 0.75rem;
	}
	.aq-progress-label {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.875rem;
		color: var(--text-primary);
	}

	/* Mastery colors */
	:global(.aq-mastery--novice) { color: var(--text-tertiary); }
	:global(.aq-mastery--learning) { color: #d97706; }
	:global(.dark) :global(.aq-mastery--learning) { color: #fbbf24; }
	:global(.aq-mastery--practicing) { color: #2563eb; }
	:global(.dark) :global(.aq-mastery--practicing) { color: #60a5fa; }
	:global(.aq-mastery--proficient) { color: #059669; }
	:global(.dark) :global(.aq-mastery--proficient) { color: #34d399; }
	:global(.aq-mastery--mastered) { color: #7c3aed; }
	:global(.dark) :global(.aq-mastery--mastered) { color: #a78bfa; }

	/* Buttons */
	.aq-secondary-btn {
		display: flex;
		flex: 1;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-color);
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-secondary);
		transition: background-color 0.15s;
	}
	.aq-secondary-btn:hover {
		background-color: var(--bg-tertiary);
	}
	.aq-primary-btn {
		display: flex;
		flex: 1;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		border-radius: var(--radius-lg);
		background-color: var(--accent-color);
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: white;
		transition: opacity 0.15s;
	}
	.aq-primary-btn:hover { opacity: 0.9; }

	/* Active quiz header */
	.aq-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid var(--border-color);
		padding: 0.75rem 1rem;
	}
	.aq-progress-track {
		height: 0.5rem;
		width: 6rem;
		overflow: hidden;
		border-radius: 9999px;
		background-color: var(--bg-tertiary);
	}
	.aq-progress-fill {
		height: 100%;
		background-color: var(--accent-color);
		transition: width 0.3s;
	}

	/* Mastery bar */
	.aq-mastery-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid var(--border-color);
		background-color: var(--bg-tertiary);
		padding: 0.5rem 1rem;
	}

	/* Problem label */
	.aq-problem-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-secondary);
		margin-bottom: 0.75rem;
	}

	/* Show answer button */
	.aq-show-answer-btn {
		display: flex;
		width: 100%;
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
	.aq-show-answer-btn:hover { opacity: 0.85; }

	/* Answer box */
	.aq-answer-box {
		border-radius: var(--radius-lg);
		border: 1px solid #a7f3d0;
		background-color: #ecfdf5;
		padding: 1rem;
	}
	:global(.dark) .aq-answer-box {
		border-color: rgba(6,78,59,0.5);
		background-color: rgba(6,78,59,0.2);
	}
	.aq-answer-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: #047857;
		margin-bottom: 0.5rem;
	}
	:global(.dark) .aq-answer-title { color: #34d399; }
	.aq-answer-text {
		font-size: 0.875rem;
		color: #065f46;
	}
	:global(.dark) .aq-answer-text { color: #a7f3d0; }

	/* Assess area */
	.aq-assess-area {
		border-radius: var(--radius-lg);
		background-color: var(--bg-tertiary);
		padding: 1rem;
	}
	.aq-assess-prompt {
		text-align: center;
		font-size: 0.875rem;
		color: var(--text-secondary);
		margin-bottom: 0.75rem;
	}
	.aq-assess-btn {
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
	.aq-assess-btn:hover { opacity: 0.85; }
	.aq-assess-btn--correct {
		border-color: #86efac;
		background-color: #ecfdf5;
		color: #047857;
	}
	:global(.dark) .aq-assess-btn--correct {
		border-color: rgba(6,78,59,0.5);
		background-color: rgba(6,78,59,0.2);
		color: #34d399;
	}
	.aq-assess-btn--wrong {
		border-color: #fca5a5;
		background-color: #fef2f2;
		color: #b91c1c;
	}
	:global(.dark) .aq-assess-btn--wrong {
		border-color: rgba(127,29,29,0.5);
		background-color: rgba(127,29,29,0.2);
		color: #fca5a5;
	}

	/* Footer */
	.aq-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-top: 1px solid var(--border-color);
		padding: 0.5rem 1rem;
	}
</style>
