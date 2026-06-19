/**
 * practiceReveal — hide the "Kannaðu þekkingu þína" (Check Your Learning)
 * answer inside Example blocks behind a "Sýna svar" toggle, so students
 * attempt the practice question before the answer is revealed.
 *
 * The CNXML renderer marks that answer with `class="check-knowledge-answer"`
 * (a classless note inside a worked example). We collapse it and inject a toggle
 * button before it. The worked Example solution (a `.para-title`, not a note)
 * and other note types (link-to-learning, etc.) are left untouched and visible.
 *
 * Transition fallback: content not yet re-rendered with the marker is still
 * matched heuristically as a `.note-default` aside headed "Svar:". Once all
 * content carries the marker, the fallback (and `isAnswerNote`) can be removed.
 *
 * Vefur-only: the hidden class and toggle button are reader presentation, not
 * pipeline output — styles are injected here rather than added to the
 * cross-repo content.css contract.
 */

import { quizStore } from '$lib/stores/quiz';

const PROCESSED_ATTR = 'data-practice-reveal';
const STYLE_ID = 'practice-reveal-styles';

export interface PracticeRevealOptions {
	bookSlug?: string;
	chapterSlug?: string;
	sectionSlug?: string;
	content?: string;
}

/** Walk back over question paragraphs preceding the answer note to build question text. */
function questionText(answer: HTMLElement): string {
	const parts: string[] = [];
	let el = answer.previousElementSibling;
	while (el && el.tagName === 'P' && !el.classList.contains('para-title')) {
		parts.unshift((el.textContent || '').trim());
		el = el.previousElementSibling;
	}
	return parts.join(' ');
}

/** A check-your-knowledge answer is a `.note-default` aside headed "Svar:". */
function isAnswerNote(aside: Element): boolean {
	if (!aside.classList.contains('note-default')) return false;
	const heading = aside.querySelector('h4');
	return !!heading && /^\s*svar/i.test(heading.textContent || '');
}

function setToggleLabel(button: HTMLButtonElement, expanded: boolean): void {
	button.textContent = expanded ? 'Fela svar' : 'Sýna svar';
	button.setAttribute('aria-expanded', String(expanded));
}

function injectStyles(): void {
	if (document.getElementById(STYLE_ID)) return;
	const style = document.createElement('style');
	style.id = STYLE_ID;
	style.textContent = `
		.practice-answer--hidden { display: none; }
		.practice-answer-toggle {
			display: inline-flex;
			align-items: center;
			gap: 0.375rem;
			/* Align the button's left edge with the practice question text
			   (the .example container has padding:0; its body paras sit at 30px). */
			margin: 0.5rem 0 0.75rem 30px;
			padding: 0.4rem 0.85rem;
			font-size: 0.875rem;
			font-weight: 500;
			color: var(--accent-color);
			background: var(--accent-subtle, transparent);
			border: 1px solid var(--accent-color);
			border-radius: var(--radius-md, 0.5rem);
			cursor: pointer;
			transition: background-color 0.15s, color 0.15s;
		}
		.practice-answer-toggle:hover {
			background: var(--accent-color);
			color: #fff;
		}
		.practice-answer-toggle:focus-visible {
			outline: 2px solid var(--accent-color);
			outline-offset: 2px;
		}
	`;
	document.head.appendChild(style);
}

interface RevealState {
	id: number;
	cleanups: Array<() => void>;
}

function processAnswer(answer: HTMLElement, state: RevealState, opts: PracticeRevealOptions): void {
	if (answer.hasAttribute(PROCESSED_ATTR)) return;
	answer.setAttribute(PROCESSED_ATTR, 'true');

	if (!answer.id) answer.id = `practice-answer-${++state.id}`;
	answer.classList.add('practice-answer--hidden');

	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'practice-answer-toggle';
	button.setAttribute('aria-controls', answer.id);
	setToggleLabel(button, false);

	const { bookSlug, chapterSlug, sectionSlug } = opts;
	const trackingId =
		bookSlug && chapterSlug && sectionSlug
			? `${bookSlug}/${chapterSlug}/${sectionSlug}#${answer.id}`
			: null;
	let registered = false;

	const onClick = () => {
		const nowHidden = answer.classList.toggle('practice-answer--hidden');
		setToggleLabel(button, !nowHidden);
		if (!nowHidden && trackingId && !registered) {
			registered = true;
			quizStore.markPracticeProblemViewed(
				trackingId,
				bookSlug!,
				chapterSlug!,
				sectionSlug!,
				questionText(answer),
				(answer.textContent || '').trim().slice(0, 2000),
				'inline'
			);
		}
	};
	button.addEventListener('click', onClick);
	answer.parentNode?.insertBefore(button, answer);

	state.cleanups.push(() => {
		button.removeEventListener('click', onClick);
		button.remove();
		answer.classList.remove('practice-answer--hidden');
		answer.removeAttribute(PROCESSED_ATTR);
	});
}

/**
 * Svelte action: attach to the `.reading-content` container. Pass `opts`
 * (bookSlug, chapterSlug, sectionSlug, content) so the action can register
 * revealed answers with the quiz store and re-scan after client-side navigation
 * (the container is reused and its innerHTML swapped). Idempotent via
 * {@link PROCESSED_ATTR}. All opts fields are optional so existing call-sites
 * that omit them continue to work.
 */
export function practiceReveal(node: HTMLElement, opts: PracticeRevealOptions = {}) {
	injectStyles();
	const state: RevealState = { id: 0, cleanups: [] };

	function scan(): void {
		// Preferred: the explicit marker emitted by the CNXML renderer (path a).
		node.querySelectorAll('aside.check-knowledge-answer').forEach((aside) => {
			processAnswer(aside as HTMLElement, state, opts);
		});
		// Fallback for content not yet re-rendered with the marker: a default
		// note headed "Svar:" inside a worked example. The PROCESSED_ATTR guard
		// keeps an element matched by both selectors from being processed twice.
		node.querySelectorAll('aside.note-default').forEach((aside) => {
			if (isAnswerNote(aside)) processAnswer(aside as HTMLElement, state, opts);
		});
	}

	scan();

	return {
		update(newOpts: PracticeRevealOptions) {
			// On soft-nav the container's innerHTML was replaced, so previously
			// processed nodes (and their toggles) are gone with it. Re-assign opts
			// so the new section's slugs are used for registration, then re-scan.
			opts = newOpts;
			scan();
		},
		destroy() {
			state.cleanups.forEach((fn) => fn());
			state.cleanups = [];
		}
	};
}
