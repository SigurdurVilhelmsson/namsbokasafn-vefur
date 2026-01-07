/**
 * Svelte action to add interactivity to practice problems rendered via {@html}
 * This handles practice problems that come from markdown content
 */

interface PracticeProblemState {
	showAnswer: boolean;
	selfAssessment: 'correct' | 'incorrect' | null;
	revealedHints: number;
}

export function practiceProblems(node: HTMLElement) {
	const states = new Map<HTMLElement, PracticeProblemState>();

	function initializePracticeProblems() {
		const problems = node.querySelectorAll('.practice-problem-container');

		problems.forEach((problem, index) => {
			if (problem.hasAttribute('data-initialized')) return;
			problem.setAttribute('data-initialized', 'true');

			const state: PracticeProblemState = {
				showAnswer: false,
				selfAssessment: null,
				revealedHints: 0
			};
			states.set(problem as HTMLElement, state);

			// Find content sections
			const answerContainer = problem.querySelector('.practice-answer-container');
			const explanationContainer = problem.querySelector('.practice-explanation-container');
			const hintContainers = problem.querySelectorAll('.practice-hint-container');

			// Wrap the problem content
			wrapProblemContent(problem as HTMLElement, state, {
				answerContainer: answerContainer as HTMLElement | null,
				explanationContainer: explanationContainer as HTMLElement | null,
				hintContainers: Array.from(hintContainers) as HTMLElement[],
				problemId: `practice-${index}`
			});
		});
	}

	function wrapProblemContent(
		problem: HTMLElement,
		state: PracticeProblemState,
		parts: {
			answerContainer: HTMLElement | null;
			explanationContainer: HTMLElement | null;
			hintContainers: HTMLElement[];
			problemId: string;
		}
	) {
		// Add wrapper class
		problem.classList.add('practice-problem');

		// Create header
		const header = document.createElement('div');
		header.className = 'practice-problem-header';
		header.innerHTML = `
			<div class="flex items-center gap-2">
				<svg class="h-5 w-5 text-[var(--accent-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
				</svg>
				<h4 class="font-semibold text-[var(--text-primary)]">Æfingadæmi</h4>
			</div>
		`;
		problem.insertBefore(header, problem.firstChild);

		// Hide answer, explanation, and hints initially
		if (parts.answerContainer) {
			parts.answerContainer.style.display = 'none';
		}
		if (parts.explanationContainer) {
			parts.explanationContainer.style.display = 'none';
		}
		parts.hintContainers.forEach((hint) => {
			hint.style.display = 'none';
		});

		// Create hints section if hints exist
		if (parts.hintContainers.length > 0) {
			const hintsSection = document.createElement('div');
			hintsSection.className = 'practice-hints-section mt-4';

			const hintsDisplay = document.createElement('div');
			hintsDisplay.className = 'hints-display mb-3 space-y-2';
			hintsDisplay.style.display = 'none';
			hintsSection.appendChild(hintsDisplay);

			const hintButton = document.createElement('button');
			hintButton.className =
				'hint-button flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition-all hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30';
			updateHintButton(hintButton, state.revealedHints, parts.hintContainers.length);
			hintsSection.appendChild(hintButton);

			hintButton.addEventListener('click', () => {
				if (state.revealedHints < parts.hintContainers.length) {
					state.revealedHints++;
					updateHintsDisplay(hintsDisplay, parts.hintContainers, state.revealedHints);
					updateHintButton(hintButton, state.revealedHints, parts.hintContainers.length);

					if (state.revealedHints >= parts.hintContainers.length) {
						hintButton.style.display = 'none';
					}
				}
			});

			// Insert hints section before answer section
			const answerSection = problem.querySelector('.practice-answer-section');
			if (answerSection) {
				problem.insertBefore(hintsSection, answerSection);
			} else if (parts.answerContainer) {
				problem.insertBefore(hintsSection, parts.answerContainer);
			} else {
				problem.appendChild(hintsSection);
			}
		}

		// Create answer controls section
		if (parts.answerContainer) {
			const answerSection = document.createElement('div');
			answerSection.className = 'practice-answer-section mt-4 pt-4 border-t border-[var(--border-color)]';

			// Show answer button
			const showButton = document.createElement('button');
			showButton.className =
				'show-answer-btn flex items-center gap-2 rounded-lg bg-[var(--accent-color)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)]';
			showButton.innerHTML = `
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
				</svg>
				<span>Sýna svar</span>
			`;
			answerSection.appendChild(showButton);

			// Answer content wrapper
			const answerWrapper = document.createElement('div');
			answerWrapper.className = 'answer-content-wrapper space-y-4';
			answerWrapper.style.display = 'none';
			answerSection.appendChild(answerWrapper);

			// Move answer content into styled wrapper
			const styledAnswer = document.createElement('div');
			styledAnswer.className =
				'rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800/50 dark:bg-emerald-900/20';
			styledAnswer.innerHTML = `
				<div class="mb-2 flex items-center gap-2 font-sans text-sm font-semibold text-emerald-700 dark:text-emerald-400">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					Svar
				</div>
				<div class="answer-text text-emerald-800 dark:text-emerald-200"></div>
			`;
			const answerText = styledAnswer.querySelector('.answer-text') as HTMLElement;
			answerText.innerHTML = parts.answerContainer.innerHTML;
			answerWrapper.appendChild(styledAnswer);

			// Add explanation if exists
			if (parts.explanationContainer) {
				const styledExplanation = document.createElement('div');
				styledExplanation.className =
					'rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800/50 dark:bg-blue-900/20';
				styledExplanation.innerHTML = `
					<div class="mb-2 flex items-center gap-2 font-sans text-sm font-semibold text-blue-700 dark:text-blue-400">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						Útskýring
					</div>
					<div class="text-sm text-blue-800 dark:text-blue-200">${parts.explanationContainer.innerHTML}</div>
				`;
				answerWrapper.appendChild(styledExplanation);
			}

			// Self-assessment section
			const selfAssessmentSection = document.createElement('div');
			selfAssessmentSection.className = 'self-assessment-section';
			selfAssessmentSection.innerHTML = `
				<div class="assessment-prompt rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
					<p class="text-sm text-[var(--text-secondary)] mb-3">Hvernig gekk?</p>
					<div class="flex gap-3">
						<button class="correct-btn flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-emerald-300 bg-emerald-50 px-4 py-2 font-medium text-emerald-700 transition-all hover:bg-emerald-100 hover:border-emerald-400 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
							Rétt hjá mér
						</button>
						<button class="incorrect-btn flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-red-300 bg-red-50 px-4 py-2 font-medium text-red-700 transition-all hover:bg-red-100 hover:border-red-400 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
							Þarf að æfa meira
						</button>
					</div>
				</div>
				<div class="assessment-feedback" style="display: none;"></div>
			`;
			answerWrapper.appendChild(selfAssessmentSection);

			// Action buttons
			const actionButtons = document.createElement('div');
			actionButtons.className = 'flex gap-2';
			actionButtons.innerHTML = `
				<button class="hide-btn flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--bg-primary)]">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
					</svg>
					Fela svar
				</button>
				<button class="reset-btn flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--bg-primary)]" style="display: none;">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
					Reyna aftur
				</button>
			`;
			answerWrapper.appendChild(actionButtons);

			// Event listeners
			showButton.addEventListener('click', () => {
				state.showAnswer = true;
				showButton.style.display = 'none';
				answerWrapper.style.display = 'block';

				// Hide hints section when showing answer
				const hintsSection = problem.querySelector('.practice-hints-section');
				if (hintsSection) {
					(hintsSection as HTMLElement).style.display = 'none';
				}
			});

			const hideBtn = actionButtons.querySelector('.hide-btn') as HTMLButtonElement;
			const resetBtn = actionButtons.querySelector('.reset-btn') as HTMLButtonElement;
			const correctBtn = selfAssessmentSection.querySelector('.correct-btn') as HTMLButtonElement;
			const incorrectBtn = selfAssessmentSection.querySelector('.incorrect-btn') as HTMLButtonElement;
			const assessmentPrompt = selfAssessmentSection.querySelector('.assessment-prompt') as HTMLElement;
			const assessmentFeedback = selfAssessmentSection.querySelector(
				'.assessment-feedback'
			) as HTMLElement;

			hideBtn.addEventListener('click', () => {
				state.showAnswer = false;
				state.selfAssessment = null;
				showButton.style.display = 'flex';
				answerWrapper.style.display = 'none';
				assessmentPrompt.style.display = 'block';
				assessmentFeedback.style.display = 'none';
				resetBtn.style.display = 'none';

				// Show hints section again
				const hintsSection = problem.querySelector('.practice-hints-section');
				if (hintsSection) {
					(hintsSection as HTMLElement).style.display = 'block';
				}
			});

			correctBtn.addEventListener('click', () => {
				state.selfAssessment = 'correct';
				assessmentPrompt.style.display = 'none';
				assessmentFeedback.style.display = 'block';
				assessmentFeedback.className =
					'assessment-feedback rounded-lg p-4 bg-emerald-50 dark:bg-emerald-900/20';
				assessmentFeedback.innerHTML = `
					<div class="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span>Vel gert! Þú hefur lokið þessu dæmi.</span>
					</div>
				`;
				resetBtn.style.display = 'flex';
				problem.classList.add('completed');
			});

			incorrectBtn.addEventListener('click', () => {
				state.selfAssessment = 'incorrect';
				assessmentPrompt.style.display = 'none';
				assessmentFeedback.style.display = 'block';
				assessmentFeedback.className =
					'assessment-feedback rounded-lg p-4 bg-amber-50 dark:bg-amber-900/20';
				assessmentFeedback.innerHTML = `
					<div class="flex items-center gap-2 text-amber-700 dark:text-amber-400">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						<span>Ekki hafa áhyggjur - æfing skapar meistara! Reyndu aftur síðar.</span>
					</div>
				`;
				resetBtn.style.display = 'flex';
			});

			resetBtn.addEventListener('click', () => {
				state.showAnswer = false;
				state.selfAssessment = null;
				state.revealedHints = 0;
				showButton.style.display = 'flex';
				answerWrapper.style.display = 'none';
				assessmentPrompt.style.display = 'block';
				assessmentFeedback.style.display = 'none';
				resetBtn.style.display = 'none';

				// Reset hints
				const hintsSection = problem.querySelector('.practice-hints-section');
				if (hintsSection) {
					(hintsSection as HTMLElement).style.display = 'block';
					const hintsDisplay = hintsSection.querySelector('.hints-display') as HTMLElement;
					const hintButton = hintsSection.querySelector('.hint-button') as HTMLButtonElement;
					if (hintsDisplay) {
						hintsDisplay.style.display = 'none';
						hintsDisplay.innerHTML = '';
					}
					if (hintButton) {
						hintButton.style.display = 'flex';
						updateHintButton(hintButton, 0, parts.hintContainers.length);
					}
				}
			});

			// Insert answer section before the original answer container
			problem.insertBefore(answerSection, parts.answerContainer);
		}
	}

	function updateHintButton(button: HTMLButtonElement, revealed: number, total: number) {
		button.innerHTML = `
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
			</svg>
			<span>Sýna vísbendingu (${revealed + 1}/${total})</span>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		`;
	}

	function updateHintsDisplay(display: HTMLElement, hints: HTMLElement[], revealed: number) {
		display.style.display = revealed > 0 ? 'block' : 'none';
		display.innerHTML = hints
			.slice(0, revealed)
			.map(
				(hint, index) => `
			<div class="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/50 dark:bg-amber-900/20">
				<svg class="w-5 h-5 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
				</svg>
				<div class="text-sm text-amber-800 dark:text-amber-200">
					<span class="font-medium">Vísbending ${index + 1}:</span>
					${hint.innerHTML}
				</div>
			</div>
		`
			)
			.join('');
	}

	// Initialize on mount
	initializePracticeProblems();

	// Re-initialize when content changes (for dynamic updates)
	const observer = new MutationObserver(() => {
		initializePracticeProblems();
	});

	observer.observe(node, { childList: true, subtree: true });

	return {
		destroy() {
			observer.disconnect();
			states.clear();
		}
	};
}
