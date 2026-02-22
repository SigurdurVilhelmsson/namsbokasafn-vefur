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
	chapterNumber?: number;  // Chapter number for answer key URLs
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
 * Create an exercise number link element (OpenStax style)
 * The number itself becomes a clickable link to the answer
 */
function createNumberLink(number: string, ariaLabel: string, href: string): HTMLAnchorElement {
	const link = document.createElement('a');
	link.className = 'exercise-number-link';
	link.href = href;
	link.setAttribute('aria-label', ariaLabel);
	link.textContent = `${number}.`;
	return link;
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

		.dark .answer-link-btn {
			color: #60a5fa;
			background-color: rgba(59, 130, 246, 0.1);
			border-color: rgba(59, 130, 246, 0.3);
		}

		.dark .answer-link-btn:hover {
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

		/* Inline answer link (OpenStax style) */
		.answer-link-inline {
			display: inline-flex;
			padding: 0.125rem 0.5rem;
			font-size: 0.75rem;
			margin-left: 0.5rem;
			margin-top: 0;
		}

		/* Exercise number as link (OpenStax style) */
		.exercise-number-link {
			position: absolute;
			left: 0;
			top: 0;
			font-weight: 700;
			color: var(--accent-color, #3b82f6);
			min-width: 2.5rem;
			text-align: right;
			padding-right: 0.5rem;
			text-decoration: none;
			cursor: pointer;
			transition: color 0.15s ease;
		}

		.exercise-number-link:hover {
			color: var(--accent-hover, #2563eb);
			text-decoration: underline;
		}

		/* Hide the pseudo-element when we have a number link */
		.eoc-exercise.has-answer-link::before {
			display: none;
		}

		/* Answer entry number as link back to exercise */
		.answer-entry.has-exercise-link::before {
			display: none;
		}

		/* Glossary entry styling */
		.glossary-entry {
			padding: 1rem;
			margin: 0.75rem 0;
			border-left: 4px solid #8b5cf6;
			background-color: #f5f3ff;
			border-radius: 0 0.5rem 0.5rem 0;
		}

		.dark .glossary-entry {
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

		.dark .key-equation-entry {
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

	const { bookSlug, chapterSlug, sectionSlug, sectionType, chapterNumber } = options;
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

	// Track created link elements for cleanup
	const links: HTMLAnchorElement[] = [];

	// Determine the exercises section slug for linking back from answer key
	const exercisesSectionSlug = sectionSlug
		.replace('answer-key', 'exercises')
		.replace('svarlykill', 'aefingar');

	// Find exercise/answer containers
	if (isExercisePage && chapterNumber) {
		// On exercises page - add "See answer" links to odd-numbered exercises
		// Answer keys are now at /svarlykill/[chapter] route
		const exercises = node.querySelectorAll<HTMLElement>('.practice-problem-container, .eoc-exercise');

		exercises.forEach((exercise) => {
			// Get exercise ID and number
			const exerciseId = exercise.dataset.problemId || exercise.id || exercise.dataset.exerciseId;
			const exerciseNum = exercise.dataset.exerciseNumber;
			if (!exerciseId) return;

			// Only odd-numbered exercises have answers in OpenStax
			// Exercise numbers are now in format "1.1", "9.105" (chapter.exerciseNum)
			// Extract just the exercise number after the decimal point
			const numStr = exerciseNum || '0';
			const num = numStr.includes('.')
				? parseInt(numStr.split('.')[1], 10)
				: parseInt(numStr, 10);
			if (num > 0 && num % 2 === 0) return; // Skip even numbers

			// For eoc-exercise, make the number itself a link (OpenStax style)
			// Link to the new answer key route: /svarlykill/[chapter]#[exerciseId]
			if (exercise.classList.contains('eoc-exercise') && exerciseNum) {
				const url = `/${bookSlug}/svarlykill/${chapterNumber}#${exerciseId}`;
				const numberLink = createNumberLink(
					exerciseNum,
					`Fara í svar við æfingu ${exerciseNum}`,
					url
				);

				// Add class to hide the ::before pseudo-element
				exercise.classList.add('has-answer-link');

				// Prepend the number link to the exercise
				exercise.insertBefore(numberLink, exercise.firstChild);
				links.push(numberLink);
			} else {
				// For practice-problem-container, use button in footer
				const button = createLinkButton(
					'Svar',
					'Fara í svar við þessari æfingu',
					() => {
						const url = `/${bookSlug}/svarlykill/${chapterNumber}#${exerciseId}`;
						goto(url);
					}
				);

				let footer = exercise.querySelector('.practice-problem-footer');
				if (!footer) {
					footer = document.createElement('div');
					footer.className = 'practice-problem-footer';
					exercise.appendChild(footer);
				}
				footer.appendChild(button);
				buttons.push(button);
			}
		});
	}

	if (isAnswerKeyPage && chapterSlug) {
		// On answer-key page - make numbers link back to exercises
		// Link back to /kafli/[chapterSlug]/[exercises-slug]#[exerciseId]
		const answers = node.querySelectorAll<HTMLElement>('.answer-entry');

		answers.forEach((answer) => {
			const exerciseId = answer.dataset.exerciseId || answer.id;
			const exerciseNum = answer.dataset.exerciseNumber;
			if (!exerciseId) return;

			// Make the number itself a link back to the exercise (OpenStax style)
			// Exercises are at /kafli/[chapterSlug]/[chapter]-exercises
			if (exerciseNum) {
				const exercisesSlug = chapterNumber ? `${chapterNumber}-exercises` : exercisesSectionSlug;
				const url = `/${bookSlug}/kafli/${chapterSlug}/${exercisesSlug}#${exerciseId}`;
				const numberLink = createNumberLink(
					exerciseNum,
					`Fara í æfingu ${exerciseNum}`,
					url
				);

				// Add class to hide the ::before pseudo-element
				answer.classList.add('has-exercise-link');

				// Prepend the number link to the answer
				answer.insertBefore(numberLink, answer.firstChild);
				links.push(numberLink);
			} else {
				// Fallback to button if no number
				const button = createLinkButton(
					'Æfing',
					'Fara í æfinguna sem þetta svar tilheyrir',
					() => {
						const exercisesSlug = chapterNumber ? `${chapterNumber}-exercises` : exercisesSectionSlug;
						const url = `/${bookSlug}/kafli/${chapterSlug}/${exercisesSlug}#${exerciseId}`;
						goto(url);
					}
				);

				button.classList.add('answer-link-inline');
				answer.appendChild(button);
				buttons.push(button);
			}
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
				console.debug('answerLinks: sectionSlug changed, consider remounting');
			}
		},
		destroy() {
			// Clean up buttons
			buttons.forEach((button) => {
				button.remove();
			});
			// Clean up links
			links.forEach((link) => {
				// Remove the has-answer-link class from parent before removing link
				link.parentElement?.classList.remove('has-answer-link', 'has-exercise-link');
				link.remove();
			});
		}
	};
}
