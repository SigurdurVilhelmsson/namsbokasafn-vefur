/**
 * Answer Links Action
 *
 * Enables bidirectional navigation between exercises (:::practice-problem{#fs-id*})
 * and their answers (:::answer-entry{#fs-id*}) in answer key pages.
 *
 * When viewing exercises:
 * - Adds "Sjá svar" (See answer) link to each exercise
 * - Links to the answer-key section with the specific answer highlighted
 *
 * When viewing answer key:
 * - Adds "Sjá æfingu" (See exercise) link to each answer
 * - Links back to the exercises section with the specific exercise highlighted
 */

import { browser } from '$app/environment';
import { goto } from '$app/navigation';

export interface AnswerLinksOptions {
	bookSlug: string;
	chapterSlug: string;
	sectionSlug: string;
	sectionType?: string;  // 'exercises' or 'answer-key'
}

/**
 * Get the counterpart section slug for navigation
 * exercises -> answer-key, answer-key -> exercises
 */
function getCounterpartSlug(sectionSlug: string, sectionType?: string): string | null {
	if (sectionType === 'exercises' || sectionSlug.includes('exercises') || sectionSlug.includes('aefingar')) {
		// Navigate from exercises to answer-key
		return sectionSlug
			.replace('exercises', 'answer-key')
			.replace('aefingar', 'svarlykill');
	}
	if (sectionType === 'answer-key' || sectionSlug.includes('answer-key') || sectionSlug.includes('svarlykill')) {
		// Navigate from answer-key to exercises
		return sectionSlug
			.replace('answer-key', 'exercises')
			.replace('svarlykill', 'aefingar');
	}
	return null;
}

/**
 * Create a link button element
 */
function createLinkButton(text: string, ariaLabel: string, onClick: () => void): HTMLButtonElement {
	const button = document.createElement('button');
	button.className = 'answer-link-btn';
	button.setAttribute('aria-label', ariaLabel);
	button.innerHTML = `
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
		</svg>
		<span>${text}</span>
	`;
	button.addEventListener('click', onClick);
	return button;
}

/**
 * Add CSS styles for answer link buttons
 */
function addStyles() {
	const styleId = 'answer-links-styles';
	if (document.getElementById(styleId)) return;

	const style = document.createElement('style');
	style.id = styleId;
	style.textContent = `
		.answer-link-btn {
			display: inline-flex;
			align-items: center;
			gap: 0.375rem;
			padding: 0.375rem 0.75rem;
			font-size: 0.75rem;
			font-weight: 500;
			color: #3b82f6;
			background-color: #eff6ff;
			border: 1px solid #bfdbfe;
			border-radius: 0.5rem;
			cursor: pointer;
			transition: all 0.15s ease;
			margin-top: 0.5rem;
		}

		.answer-link-btn:hover {
			background-color: #dbeafe;
			border-color: #93c5fd;
			color: #2563eb;
		}

		:global(.dark) .answer-link-btn {
			color: #60a5fa;
			background-color: rgba(59, 130, 246, 0.1);
			border-color: rgba(59, 130, 246, 0.3);
		}

		:global(.dark) .answer-link-btn:hover {
			background-color: rgba(59, 130, 246, 0.2);
			border-color: rgba(59, 130, 246, 0.4);
		}

		.answer-link-btn svg {
			width: 1rem;
			height: 1rem;
		}

		/* Highlight animation for linked items */
		.answer-link-highlight {
			animation: answer-link-highlight 2s ease-out;
		}

		@keyframes answer-link-highlight {
			0% {
				background-color: rgba(59, 130, 246, 0.3);
				box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
			}
			100% {
				background-color: transparent;
				box-shadow: none;
			}
		}

		/* Answer entry styling */
		.answer-entry {
			padding: 1rem;
			margin: 1rem 0;
			border-left: 4px solid #10b981;
			background-color: #ecfdf5;
			border-radius: 0 0.5rem 0.5rem 0;
		}

		:global(.dark) .answer-entry {
			background-color: rgba(16, 185, 129, 0.1);
			border-color: #059669;
		}

		/* Glossary entry styling */
		.glossary-entry {
			padding: 1rem;
			margin: 0.75rem 0;
			border-left: 4px solid #8b5cf6;
			background-color: #f5f3ff;
			border-radius: 0 0.5rem 0.5rem 0;
		}

		:global(.dark) .glossary-entry {
			background-color: rgba(139, 92, 246, 0.1);
			border-color: #7c3aed;
		}

		/* Key equation entry styling */
		.key-equation-entry {
			padding: 1rem;
			margin: 0.75rem 0;
			border-left: 4px solid #f59e0b;
			background-color: #fffbeb;
			border-radius: 0 0.5rem 0.5rem 0;
		}

		:global(.dark) .key-equation-entry {
			background-color: rgba(245, 158, 11, 0.1);
			border-color: #d97706;
		}
	`;
	document.head.appendChild(style);
}

/**
 * Svelte action for answer-exercise bidirectional linking
 */
export function answerLinks(node: HTMLElement, options: AnswerLinksOptions) {
	if (!browser) {
		return { destroy: () => {} };
	}

	const { bookSlug, chapterSlug, sectionSlug, sectionType } = options;
	const counterpartSlug = getCounterpartSlug(sectionSlug, sectionType);
	const buttons: HTMLButtonElement[] = [];

	// Add styles
	addStyles();

	// Determine if we're on exercises or answer-key page
	const isExercisePage = sectionType === 'exercises' ||
		sectionSlug.includes('exercises') ||
		sectionSlug.includes('aefingar');

	const isAnswerKeyPage = sectionType === 'answer-key' ||
		sectionSlug.includes('answer-key') ||
		sectionSlug.includes('svarlykill');

	// Find exercise/answer containers
	if (isExercisePage && counterpartSlug) {
		// On exercises page - add "See answer" links
		const problems = node.querySelectorAll<HTMLElement>('.practice-problem-container');

		problems.forEach((problem) => {
			const problemId = problem.dataset.problemId;
			if (!problemId) return;

			const button = createLinkButton(
				'Sjá svar',
				'Fara í svar við þessari æfingu',
				() => {
					const url = `/${bookSlug}/kafli/${chapterSlug}/${counterpartSlug}#${problemId}`;
					goto(url);
				}
			);

			// Find or create a footer area for the button
			let footer = problem.querySelector('.practice-problem-footer');
			if (!footer) {
				footer = document.createElement('div');
				footer.className = 'practice-problem-footer';
				problem.appendChild(footer);
			}
			footer.appendChild(button);
			buttons.push(button);
		});
	}

	if (isAnswerKeyPage && counterpartSlug) {
		// On answer-key page - add "See exercise" links
		const answers = node.querySelectorAll<HTMLElement>('.answer-entry');

		answers.forEach((answer) => {
			const exerciseId = answer.dataset.exerciseId;
			if (!exerciseId) return;

			const button = createLinkButton(
				'Sjá æfingu',
				'Fara í æfinguna sem þetta svar tilheyrir',
				() => {
					const url = `/${bookSlug}/kafli/${chapterSlug}/${counterpartSlug}#${exerciseId}`;
					goto(url);
				}
			);

			// Insert button at the start of the answer entry
			answer.insertBefore(button, answer.firstChild);
			buttons.push(button);
		});
	}

	// Check if we arrived at this page with a hash - highlight the target
	if (window.location.hash) {
		const targetId = window.location.hash.slice(1);
		const targetElement = document.getElementById(targetId);
		if (targetElement) {
			// Scroll to element
			setTimeout(() => {
				targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
				targetElement.classList.add('answer-link-highlight');
				setTimeout(() => {
					targetElement.classList.remove('answer-link-highlight');
				}, 2000);
			}, 100);
		}
	}

	return {
		update(newOptions: AnswerLinksOptions) {
			// If options change, we'd need to rebuild - for now just log
			if (newOptions.sectionSlug !== sectionSlug) {
				console.warn('answerLinks: sectionSlug changed, consider remounting');
			}
		},
		destroy() {
			// Clean up buttons
			buttons.forEach((button) => {
				button.remove();
			});
		}
	};
}
