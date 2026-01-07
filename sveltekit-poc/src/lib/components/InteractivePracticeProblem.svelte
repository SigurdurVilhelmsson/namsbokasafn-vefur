<!--
  InteractivePracticeProblem - Self-assessment practice problem component
-->
<script lang="ts">
	import { quizStore } from '$lib/stores';
	import { page } from '$app/stores';

	export let problemId: string = '';
	export let problemContent: string = '';
	export let answerContent: string = '';
	export let explanationContent: string = '';
	export let hints: string[] = [];

	let showAnswer = false;
	let selfAssessment: 'correct' | 'incorrect' | null = null;
	let revealedHints = 0;

	// Generate stable ID
	$: stableId = problemId || `practice-${$page.params.chapterSlug}-${$page.params.sectionSlug}-${Math.random().toString(36).slice(2, 8)}`;

	// Check if completed
	$: progress = quizStore.getPracticeProblemProgress(stableId);
	$: isCompleted = progress?.isCompleted ?? false;

	function handleShowAnswer() {
		showAnswer = true;
	}

	function handleHideAnswer() {
		showAnswer = false;
		selfAssessment = null;
	}

	function handleSelfAssessment(result: 'correct' | 'incorrect') {
		selfAssessment = result;
		if (result === 'correct') {
			quizStore.markPracticeProblemCompleted(stableId);
		}
	}

	function handleReset() {
		showAnswer = false;
		selfAssessment = null;
		revealedHints = 0;
	}

	function handleRevealHint() {
		if (revealedHints < hints.length) {
			revealedHints += 1;
		}
	}
</script>

<div class="practice-problem" class:completed={isCompleted}>
	<!-- Header -->
	<div class="practice-problem-header">
		<div class="flex items-center gap-2">
			<svg class="h-5 w-5 text-[var(--accent-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
			</svg>
			<h4 class="font-semibold text-[var(--text-primary)]">Æfingadæmi</h4>
		</div>
		{#if isCompleted}
			<div class="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<span>Lokið</span>
			</div>
		{/if}
	</div>

	<!-- Problem content -->
	<div class="practice-problem-content">
		{@html problemContent}
	</div>

	<!-- Hints section - shown before answer -->
	{#if hints.length > 0 && !showAnswer}
		<div class="mt-4">
			<!-- Revealed hints -->
			{#if revealedHints > 0}
				<div class="mb-3 space-y-2">
					{#each hints.slice(0, revealedHints) as hint, index}
						<div class="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/50 dark:bg-amber-900/20">
							<svg class="w-5 h-5 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
							</svg>
							<div class="text-sm text-amber-800 dark:text-amber-200">
								<span class="font-medium">Vísbending {index + 1}:</span>
								{@html hint}
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Button to reveal more hints -->
			{#if revealedHints < hints.length}
				<button
					on:click={handleRevealHint}
					class="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition-all hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
					</svg>
					<span>Sýna vísbendingu ({revealedHints + 1}/{hints.length})</span>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</button>
			{/if}
		</div>
	{/if}

	<!-- Answer section -->
	{#if answerContent}
		<div class="mt-4 pt-4 border-t border-[var(--border-color)]">
			{#if !showAnswer}
				<!-- Show answer button -->
				<button
					on:click={handleShowAnswer}
					class="flex items-center gap-2 rounded-lg bg-[var(--accent-color)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
					aria-expanded={showAnswer}
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
					</svg>
					<span>Sýna svar</span>
				</button>
			{:else}
				<div class="space-y-4">
					<!-- Answer content -->
					<div class="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800/50 dark:bg-emerald-900/20">
						<div class="mb-2 flex items-center gap-2 font-sans text-sm font-semibold text-emerald-700 dark:text-emerald-400">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							Svar
						</div>
						<div class="text-emerald-800 dark:text-emerald-200">
							{@html answerContent}
						</div>
					</div>

					<!-- Explanation section -->
					{#if explanationContent}
						<div class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800/50 dark:bg-blue-900/20">
							<div class="mb-2 flex items-center gap-2 font-sans text-sm font-semibold text-blue-700 dark:text-blue-400">
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								Útskýring
							</div>
							<div class="text-sm text-blue-800 dark:text-blue-200">
								{@html explanationContent}
							</div>
						</div>
					{/if}

					<!-- Self-assessment section -->
					{#if selfAssessment === null}
						<div class="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
							<p class="text-sm text-[var(--text-secondary)] mb-3">Hvernig gekk?</p>
							<div class="flex gap-3">
								<button
									on:click={() => handleSelfAssessment('correct')}
									class="flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-emerald-300 bg-emerald-50 px-4 py-2 font-medium text-emerald-700 transition-all hover:bg-emerald-100 hover:border-emerald-400 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
								>
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
									</svg>
									Rétt hjá mér
								</button>
								<button
									on:click={() => handleSelfAssessment('incorrect')}
									class="flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-red-300 bg-red-50 px-4 py-2 font-medium text-red-700 transition-all hover:bg-red-100 hover:border-red-400 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
								>
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
									</svg>
									Þarf að æfa meira
								</button>
							</div>
						</div>
					{:else}
						<!-- Feedback after self-assessment -->
						<div class="rounded-lg p-4 {selfAssessment === 'correct' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}">
							{#if selfAssessment === 'correct'}
								<div class="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									<span>Vel gert! Þú hefur lokið þessu dæmi.</span>
								</div>
							{:else}
								<div class="flex items-center gap-2 text-amber-700 dark:text-amber-400">
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
									</svg>
									<span>Ekki hafa áhyggjur - æfing skapar meistara! Reyndu aftur síðar.</span>
								</div>
							{/if}
						</div>
					{/if}

					<!-- Action buttons -->
					<div class="flex gap-2">
						<button
							on:click={handleHideAnswer}
							class="flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--bg-primary)]"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
							</svg>
							Fela svar
						</button>
						{#if selfAssessment}
							<button
								on:click={handleReset}
								class="flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--bg-primary)]"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
								</svg>
								Reyna aftur
							</button>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.practice-problem {
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 0.75rem;
		padding: 1.5rem;
		margin: 2rem 0;
	}

	.practice-problem.completed {
		border-color: #10b981;
		background-color: rgba(16, 185, 129, 0.05);
	}

	.practice-problem-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.practice-problem-content {
		color: var(--text-primary);
	}

	.practice-problem-content :global(p) {
		margin-bottom: 0.75rem;
	}

	.practice-problem-content :global(p:last-child) {
		margin-bottom: 0;
	}
</style>
