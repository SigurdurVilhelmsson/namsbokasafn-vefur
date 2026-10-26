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
 * A transition fallback once also matched a `.note-default` aside headed
 * "Svar:". It was removed on 2026-10-04, when 0 answers in any book relied
 * on it (vefur's static/content and efni main 08014ad4b; 292 carry the marker).
 *
 * Vefur-only: the hidden class and toggle button are reader presentation, not
 * pipeline output — styles are injected here rather than added to the
 * cross-repo content.css contract.
 *
 * On reveal the problem is stored for practice review (/prof and /nam): its
 * question (every sibling back to the problem's heading, equations, images and
 * tables included) and its answer, as text and as trimmed HTML
 * (utils/practiceSnapshot.ts). Plan step S3.1, register PED-12 and PED-13.
 */

import { quizStore } from '$lib/stores/quiz';
import { snapshotOf } from '$lib/utils/practiceSnapshot';

const PROCESSED_ATTR = 'data-practice-reveal';
const STYLE_ID = 'practice-reveal-styles';

export interface PracticeRevealOptions {
	bookSlug?: string;
	chapterSlug?: string;
	sectionSlug?: string;
	/** Passed only to trigger Svelte's `update()` on soft-nav; the action scans the DOM, not this value. */
	content?: string;
}

/**
 * Where a problem's question starts: its heading (`p.para-title`; the wording varies, so never
 * match the text), or the end of the previous problem in the same example: its answer, or the
 * self-assessment row this action put after that answer.
 */
const QUESTION_START = 'p.para-title, aside.check-knowledge-answer, .practice-self-assess';
/** This action's own toggle, which sits before the answer once the answer is processed. */
const OWN_CONTROL = 'button.practice-answer-toggle';

/**
 * The question's elements: every sibling between the answer and the start of its problem,
 * paragraphs, equations, images and tables alike. Before S3.1 the walk took `<p>` siblings
 * only and stopped at anything else, so 47 of 292 questions were stored empty and 19 cut short
 * (PED-12).
 */
export function questionElements(answer: Element): Element[] {
	const elements: Element[] = [];
	for (let el = answer.previousElementSibling; el; el = el.previousElementSibling) {
		if (el.matches(OWN_CONTROL)) continue;
		if (el.matches(QUESTION_START)) break;
		elements.unshift(el);
	}
	return elements;
}

/** The answer's body: everything but its leading `<h4>` ('Svar:'), which the review views print themselves. */
function answerBody(answer: Element): Node[] {
	const heading = answer.firstElementChild?.localName === 'h4' ? answer.firstElementChild : null;
	return [...answer.childNodes].filter((n) => n !== heading);
}

/** A snapshot's HTML above this size is not kept (the text still is). The largest problem is about 4,000 characters. */
const MAX_SNAPSHOT_HTML = 16_000;
const keepHtml = (html: string) => (html && html.length <= MAX_SNAPSHOT_HTML ? html : undefined);

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
			color: var(--accent-strong);
			background: var(--accent-subtle, transparent);
			border: 1px solid var(--accent-color);
			border-radius: var(--radius-md, 0.5rem);
			cursor: pointer;
			transition: background-color 0.15s, color 0.15s;
		}
		.practice-answer-toggle:hover {
			background: var(--accent-color);
			color: var(--on-accent);
		}
		.practice-self-assess {
			display: flex;
			gap: 0.5rem;
			margin: 0.25rem 0 0.75rem 30px;
		}
		.practice-assess-btn {
			display: inline-flex;
			align-items: center;
			padding: 0.3rem 0.75rem;
			font-size: 0.8125rem;
			font-weight: 500;
			color: var(--accent-strong);
			background: var(--accent-subtle, transparent);
			border: 1px solid var(--accent-color);
			border-radius: var(--radius-md, 0.5rem);
			cursor: pointer;
			transition: background-color 0.15s, color 0.15s;
		}
		.practice-assess-btn:hover {
			background: var(--accent-color);
			color: var(--on-accent);
		}
		/* Dim the unchosen button after one has been selected */
		.practice-self-assess[data-answered] .practice-assess-btn:not(:focus-visible) {
			opacity: 0.4;
		}
		.practice-self-assess[data-answered="right"] .practice-assess-btn[data-success="true"],
		.practice-self-assess[data-answered="more"] .practice-assess-btn[data-success="false"] {
			opacity: 1;
		}
		.practice-assess-btn:disabled {
			cursor: default;
			opacity: 0.45;
		}
		.practice-self-assess[data-answered="right"] .practice-assess-btn[data-success="true"]:disabled,
		.practice-self-assess[data-answered="more"] .practice-assess-btn[data-success="false"]:disabled {
			opacity: 1;
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

	// Build the self-assessment row (shown with the answer, hidden when collapsed).
	const assess = document.createElement('div');
	assess.className = 'practice-self-assess';
	assess.hidden = true;
	const mkAssessBtn = (label: string, success: boolean) => {
		const b = document.createElement('button');
		b.type = 'button';
		b.className = 'practice-assess-btn';
		b.dataset.success = String(success);
		b.textContent = label;
		b.addEventListener('click', () => {
			if (trackingId) quizStore.markPracticeProblemAttempt(trackingId, success);
			assess.dataset.answered = success ? 'right' : 'more';
			// Disable both buttons — one self-assessment per answer note.
			assess
				.querySelectorAll('.practice-assess-btn')
				.forEach((btn) => ((btn as HTMLButtonElement).disabled = true));
		});
		return b;
	};
	assess.append(mkAssessBtn('Rétt hjá mér', true), mkAssessBtn('Þarf að æfa meira', false));
	answer.after(assess);

	// The question's elements, found now; their snapshot is taken on reveal, from the page as
	// it is then (bionic reading may have been switched on since; the snapshot unwraps it).
	const question = questionElements(answer);

	const onClick = () => {
		const nowHidden = answer.classList.toggle('practice-answer--hidden');
		assess.hidden = nowHidden;
		setToggleLabel(button, !nowHidden);
		if (!nowHidden && trackingId && !registered) {
			// Once per visit. A record stored on an earlier visit is refreshed, which heals the
			// empty and cut questions stored before S3.1.
			registered = true;
			const q = snapshotOf(question);
			const a = snapshotOf(answerBody(answer));
			quizStore.recordPracticeProblem(trackingId, bookSlug!, chapterSlug!, sectionSlug!, {
				content: q.text,
				answer: a.text,
				contentHtml: keepHtml(q.html),
				answerHtml: keepHtml(a.html)
			});
		}
	};
	button.addEventListener('click', onClick);
	answer.parentNode?.insertBefore(button, answer);

	state.cleanups.push(() => {
		button.removeEventListener('click', onClick);
		button.remove();
		// assess.remove() is sufficient — its button listeners need no explicit
		// removeEventListener because nothing outside holds a reference to them.
		assess.remove();
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
		// Reset the position counter so a freshly-rebuilt innerHTML (soft-nav)
		// deterministically re-derives the same `practice-answer-N` fallback ids
		// rather than incrementing into a new series each visit.
		state.id = 0;
		// The explicit marker emitted by the CNXML renderer
		node.querySelectorAll('aside.check-knowledge-answer').forEach((aside) => {
			processAnswer(aside as HTMLElement, state, opts);
		});
	}

	scan();

	return {
		update(newOpts: PracticeRevealOptions = {}) {
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
