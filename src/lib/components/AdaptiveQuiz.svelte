<!--
  AdaptiveQuiz - Adaptive quiz component that adjusts difficulty based on mastery
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { fade, slide } from 'svelte/transition';
	import { quizStore, type PracticeProblem } from '$lib/stores/quiz';
	import type { MasteryLevel } from '$lib/types/quiz';

	interface Props {
		bookSlug: string;
		chapterSlug?: string;
		onComplete?: () => void;
		maxProblems?: number;
	}

	let { bookSlug, chapterSlug, onComplete, maxProblems = 5 }: Props = $props();

	interface QuizState {
		currentIndex: number;
		answers: Map<string, boolean>;
		showingAnswer: boolean;
		completed: boolean;
	}

	const MASTERY_LABELS: Record<MasteryLevel, { label: string; cssClass: string; emoji: string }> = {
		novice: { label: 'Nýbyrjandi', cssClass: 'aq-mastery--novice', emoji: '🌱' },
		learning: { label: 'Að læra', cssClass: 'aq-mastery--learning', emoji: '📚' },
		practicing: { label: 'Að æfa', cssClass: 'aq-mastery--practicing', emoji: '💪' },
		proficient: { label: 'Góð tök', cssClass: 'aq-mastery--proficient', emoji: '🎯' },
		mastered: { label: 'Náð tökum', cssClass: 'aq-mastery--mastered', emoji: '🏆' }
	};

	let problems: PracticeProblem[] = $state([]);
	let quizState: QuizState = $state({
		currentIndex: 0,
		answers: new Map(),
		showingAnswer: false,
		completed: false
	});

	// Load problems on mount
	onMount(() => {
		const adaptive = quizStore.getAdaptiveProblems(bookSlug, chapterSlug, maxProblems);
		if (adaptive.length === 0) {
			problems = quizStore.getProblemsForReview(bookSlug, maxProblems);
		} else {
			problems = adaptive;
		}
	});

	let currentProblem = $derived(problems[quizState.currentIndex]);
	let totalProblems = $derived(problems.length);
	let correctCount = $derived(Array.from(quizState.answers.values()).filter(Boolean).length);
	let incorrectCount = $derived(quizState.answers.size - correctCount);
	let scorePercentage = $derived(
		quizState.answers.size > 0 ? Math.round((correctCount / quizState.answers.size) * 100) : 0
	);

	function handleShowAnswer() {
		quizState = { ...quizState, showingAnswer: true };
	}

	function handleAnswer(success: boolean) {
		if (!currentProblem) return;

		// Record the attempt in the store
		quizStore.markPracticeProblemAttempt(currentProblem.id, success);

		// Update local state
		const newAnswers = new Map(quizState.answers);
		newAnswers.set(currentProblem.id, success);

		// Move to next or complete
		if (quizState.currentIndex < totalProblems - 1) {
			quizState = {
				...quizState,
				answers: newAnswers,
				currentIndex: quizState.currentIndex + 1,
				showingAnswer: false
			};
		} else {
			quizState = {
				...quizState,
				answers: newAnswers,
				completed: true
			};
		}
	}

	function handleRestart() {
		// Reload problems
		const adaptive = quizStore.getAdaptiveProblems(bookSlug, chapterSlug, maxProblems);
		if (adaptive.length === 0) {
			problems = quizStore.getProblemsForReview(bookSlug, maxProblems);
		} else {
			problems = adaptive;
		}

		quizState = {
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
			Engin æfingadæmi tiltæk
		</h3>
		<p class="aq-empty-text">
			Farðu í gegnum efnið og leystu æfingadæmi til að byrja aðlögunarpróf.
		</p>
	</div>
{:else if quizState.completed}
	<!-- Completed state -->
	<div class="aq-card" transition:fade={{ duration: 200 }}>
		<!-- Header -->
		<div class="mb-6 text-center">
			<span class="text-5xl mb-4 block">🏆</span>
			<h3 class="aq-complete-title">Prófi lokið!</h3>
			<p class="aq-complete-text">
				Þú hefur lokið við {totalProblems} dæmi
			</p>
		</div>

		<!-- Score -->
		<div class="aq-score-box">
			<div class="aq-score-value">
				{scorePercentage}%
			</div>
			<div class="flex justify-center gap-4 text-sm">
				<span class="aq-correct-indicator">
					<Icon name="circle-check" size="sm" />
					{correctCount} rétt
				</span>
				<span class="aq-wrong-indicator">
					<Icon name="circle-x" size="sm" />
					{incorrectCount} rangt
				</span>
			</div>
		</div>

		<!-- Mastery progress -->
		<div class="mb-6 space-y-2">
			<h4 class="aq-section-title">
				<Icon name="trending-up" size="sm" />
				Framfarir
			</h4>
			<div class="space-y-1">
				{#each problems as problem (problem.id)}
					{@const masteryInfo = getMasteryInfo(problem.id)}
					{@const wasCorrect = quizState.answers.get(problem.id)}
					<div class="aq-progress-row">
						<span class="aq-progress-label">
							{problem.content.substring(0, 50)}...
						</span>
						<div class="flex items-center gap-2">
							{#if wasCorrect}
								<Icon name="circle-check" size="sm" class="aq-icon-correct" />
							{:else}
								<Icon name="circle-x" size="sm" class="aq-icon-wrong" />
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
			<button onclick={handleRestart} class="aq-secondary-btn">
				<Icon name="refresh-cw" size="sm" />
				Byrja aftur
			</button>
			{#if onComplete}
				<button onclick={onComplete} class="aq-primary-btn">
					Loka
					<Icon name="chevron-right" size="sm" />
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
				<Icon name="lightbulb" style="color: var(--accent-color);" />
				<span class="text-sm font-semibold" style="color: var(--text-primary);">Aðlögunarpróf</span>
			</div>
			<div class="flex items-center gap-3">
				<span class="text-sm" style="color: var(--text-tertiary);">
					{quizState.currentIndex + 1} / {totalProblems}
				</span>
				<div class="aq-progress-track">
					<div
						class="aq-progress-fill"
						style="width: {((quizState.currentIndex + 1) / totalProblems) * 100}%"
					></div>
				</div>
			</div>
		</div>

		<!-- Mastery indicator -->
		{#if mastery}
			<div class="aq-mastery-bar">
				<div class="flex items-center gap-2 text-sm">
					<Icon name="shield-check" size="sm" class={mastery.cssClass} />
					<span class="{mastery.cssClass}">
						{mastery.emoji} {mastery.label}
					</span>
				</div>
				{#if mastery.attempts > 0}
					<span class="text-xs" style="color: var(--text-tertiary);">
						{mastery.successRate}% nákvæmni ({mastery.attempts} tilraunir)
					</span>
				{/if}
			</div>
		{/if}

		<!-- Problem content -->
		<div class="p-6">
			<div class="mb-4">
				<h4 class="aq-problem-label">
					<Icon name="sparkles" size="sm" style="color: var(--accent-color);" />
					Dæmi {quizState.currentIndex + 1}
				</h4>
				<div class="prose prose-sm max-w-none dark:prose-invert" style="color: var(--text-primary);">
					{currentProblem?.content}
				</div>
			</div>

			<!-- Answer section -->
			{#if !quizState.showingAnswer}
				<button onclick={handleShowAnswer} class="aq-show-answer-btn">
					Sýna svar
					<Icon name="chevron-right" size="sm" />
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
								onclick={() => handleAnswer(true)}
								class="aq-assess-btn aq-assess-btn--correct"
							>
								<Icon name="circle-check" />
								Rétt
							</button>
							<button
								onclick={() => handleAnswer(false)}
								class="aq-assess-btn aq-assess-btn--wrong"
							>
								<Icon name="circle-x" />
								Rangt
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Footer with current score -->
		{#if quizState.answers.size > 0}
			<div class="aq-footer">
				<span class="text-sm" style="color: var(--text-tertiary);">Nuverandi einkunn</span>
				<div class="flex items-center gap-2">
					<span class="aq-correct-indicator text-sm">
						<Icon name="circle-check" size="sm" />
						{correctCount}
					</span>
					<span class="aq-wrong-indicator text-sm">
						<Icon name="circle-x" size="sm" />
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
	:global(.aq-icon-correct) { color: #059669; }
	:global(.dark .aq-icon-correct) { color: #34d399; }
	:global(.aq-icon-wrong) { color: #dc2626; }
	:global(.dark .aq-icon-wrong) { color: #f87171; }

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
