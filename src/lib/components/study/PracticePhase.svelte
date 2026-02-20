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
	<h2 class="pp-heading">
		Æfingar
	</h2>
	<p class="pp-description">
		Leystu dæmi til að styrkja skilninginn.
	</p>

	<!-- Progress bar -->
	<div class="mb-4">
		<div class="pp-progress-text">
			<span>Dæmi {currentIndex + 1} af {total}</span>
			<span>{progress}%</span>
		</div>
		<div class="pp-progress-track">
			<div
				class="pp-progress-fill"
				style="width: {progress}%"
			></div>
		</div>
	</div>

	{#if currentProblem}
		<div class="pp-card">
			<div class="mb-4">
				<h4 class="pp-problem-label">
					<svg class="w-4 h-4" style="color: var(--accent-color);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
					</svg>
					Dæmi {currentIndex + 1}
				</h4>
				<div class="prose prose-sm max-w-none dark:prose-invert" style="color: var(--text-primary);">
					{currentProblem.content}
				</div>
			</div>

			{#if !isShowingAnswer}
				<button
					on:click={showAnswer}
					class="pp-show-answer-btn"
				>
					Sýna svar
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</button>
			{:else}
				<div class="space-y-4">
					<div class="pp-answer-box">
						<h5 class="pp-answer-title">Svar</h5>
						<div class="pp-answer-text">
							{currentProblem.answer}
						</div>
					</div>

					<div class="pp-assess-area">
						<p class="pp-assess-prompt">Hvernig gekk?</p>
						<div class="flex gap-3">
							<button
								on:click={() => handleAnswer(true)}
								class="pp-assess-btn pp-assess-btn--correct"
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								Rétt
							</button>
							<button
								on:click={() => handleAnswer(false)}
								class="pp-assess-btn pp-assess-btn--wrong"
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

<style>
	.pp-heading {
		font-family: "Bricolage Grotesque", system-ui, sans-serif;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 0.25rem;
	}
	.pp-description {
		font-size: 0.875rem;
		color: var(--text-secondary);
		margin-bottom: 1rem;
	}
	.pp-progress-text {
		display: flex;
		justify-content: space-between;
		font-size: 0.875rem;
		color: var(--text-tertiary);
		margin-bottom: 0.25rem;
	}
	.pp-progress-track {
		height: 0.5rem;
		border-radius: 9999px;
		background-color: var(--bg-tertiary);
	}
	.pp-progress-fill {
		height: 100%;
		border-radius: 9999px;
		background-color: var(--accent-color);
		transition: width 0.3s;
	}
	.pp-card {
		border-radius: var(--radius-xl);
		border: 1px solid var(--border-color);
		background-color: var(--bg-secondary);
		padding: 1.5rem;
	}
	.pp-problem-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-secondary);
		margin-bottom: 0.75rem;
	}
	.pp-show-answer-btn {
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
	.pp-show-answer-btn:hover { opacity: 0.85; }
	.pp-answer-box {
		border-radius: var(--radius-lg);
		border: 1px solid #a7f3d0;
		background-color: #ecfdf5;
		padding: 1rem;
	}
	:global(.dark) .pp-answer-box {
		border-color: rgba(6,78,59,0.5);
		background-color: rgba(6,78,59,0.2);
	}
	.pp-answer-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: #047857;
		margin-bottom: 0.25rem;
	}
	:global(.dark) .pp-answer-title { color: #34d399; }
	.pp-answer-text {
		font-size: 0.875rem;
		color: #065f46;
	}
	:global(.dark) .pp-answer-text { color: #a7f3d0; }
	.pp-assess-area {
		border-radius: var(--radius-lg);
		background-color: var(--bg-tertiary);
		padding: 1rem;
	}
	.pp-assess-prompt {
		text-align: center;
		font-size: 0.875rem;
		color: var(--text-secondary);
		margin-bottom: 0.75rem;
	}
	.pp-assess-btn {
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
	.pp-assess-btn:hover { opacity: 0.85; }
	.pp-assess-btn--correct {
		border-color: #86efac;
		background-color: #ecfdf5;
		color: #047857;
	}
	:global(.dark) .pp-assess-btn--correct {
		border-color: rgba(6,78,59,0.5);
		background-color: rgba(6,78,59,0.2);
		color: #34d399;
	}
	.pp-assess-btn--wrong {
		border-color: #fca5a5;
		background-color: #fef2f2;
		color: #b91c1c;
	}
	:global(.dark) .pp-assess-btn--wrong {
		border-color: rgba(127,29,29,0.5);
		background-color: rgba(127,29,29,0.2);
		color: #fca5a5;
	}
</style>
