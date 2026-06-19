/**
 * Tests for practiceReveal — hide the "Kannaðu þekkingu þína" (Check Your
 * Learning) answer inside Example blocks behind a "Sýna svar" toggle.
 *
 * The answer is rendered by the CNXML pipeline as an `<aside class="note
 * note-default">` whose heading is "Svar:", sitting after the practice
 * question. The worked Example solution (a `.para-title`, not a note) and
 * other note types (link-to-learning, etc.) must stay untouched and visible.
 */

import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { quizStore } from '$lib/stores/quiz';
import { practiceReveal } from './practiceReveal';

function makeContainer(): HTMLElement {
	const el = document.createElement('div');
	el.innerHTML =
		'<aside class="example">' +
		'  <p class="example-label">Dæmi 1.4</p>' +
		'  <p class="para-title"><strong>Lausn</strong></p>' +
		'  <p id="solution">Reiknuð lausn dæmisins.</p>' +
		'  <p class="para-title"><strong>Kannaðu þekkingu þína</strong></p>' +
		'  <p id="question">(a) Hvert er rúmmálið?</p>' +
		'  <aside class="note note-default"><h4>Svar:</h4><p>(a) 0,599 cm³</p></aside>' +
		'</aside>' +
		'<aside class="note note-chemistry link-to-learning">' +
		'  <p class="note-type">Tengill til náms</p><p>Annars konar glósa.</p>' +
		'</aside>';
	document.body.appendChild(el);
	return el;
}

describe('practiceReveal action', () => {
	it('hides a "Kannaðu þekkingu þína" answer behind a "Sýna svar" toggle that reveals it', () => {
		const el = makeContainer();
		const answer = el.querySelector('aside.note-default') as HTMLElement;

		const action = practiceReveal(el);

		// Answer starts hidden
		expect(answer.classList.contains('practice-answer--hidden')).toBe(true);

		// A single toggle button was inserted, labelled "Sýna svar"
		const toggle = el.querySelector('button.practice-answer-toggle') as HTMLButtonElement;
		expect(toggle).toBeTruthy();
		expect(toggle.textContent).toContain('Sýna svar');
		expect(toggle.getAttribute('aria-expanded')).toBe('false');

		// Clicking reveals the answer and flips the label
		toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(answer.classList.contains('practice-answer--hidden')).toBe(false);
		expect(toggle.getAttribute('aria-expanded')).toBe('true');
		expect(toggle.textContent).toContain('Fela svar');

		action.destroy?.();
		el.remove();
	});

	it('leaves the worked solution and non-answer notes visible (only the answer is hidden)', () => {
		const el = makeContainer();
		practiceReveal(el);

		const solution = el.querySelector('#solution') as HTMLElement;
		const otherNote = el.querySelector('aside.note-chemistry') as HTMLElement;

		expect(solution.classList.contains('practice-answer--hidden')).toBe(false);
		expect(otherNote.classList.contains('practice-answer--hidden')).toBe(false);
		// Exactly one answer was processed → exactly one toggle
		expect(el.querySelectorAll('button.practice-answer-toggle').length).toBe(1);

		el.remove();
	});

	it('reveals an answer marked .check-knowledge-answer regardless of its heading (renderer marker, path a)', () => {
		const el = document.createElement('div');
		el.innerHTML =
			'<aside class="example">' +
			'  <p class="para-title"><strong>Kannaðu þekkingu þína</strong></p>' +
			'  <p>Spurning?</p>' +
			'  <aside class="note note-default check-knowledge-answer"><h4>Niðurstaða</h4><p>Svarið.</p></aside>' +
			'</aside>';
		document.body.appendChild(el);
		const answer = el.querySelector('aside.check-knowledge-answer') as HTMLElement;

		practiceReveal(el);

		expect(answer.classList.contains('practice-answer--hidden')).toBe(true);
		expect(el.querySelectorAll('button.practice-answer-toggle').length).toBe(1);

		el.remove();
	});

	it('processes an answer matched by BOTH marker and heuristic only once', () => {
		const el = makeContainer(); // note-default + "Svar:" heading
		el.querySelector('aside.note-default')!.classList.add('check-knowledge-answer');

		practiceReveal(el);

		expect(el.querySelectorAll('button.practice-answer-toggle').length).toBe(1);
		el.remove();
	});

	it('is idempotent — re-processing does not insert a second toggle', () => {
		const el = makeContainer();
		const action = practiceReveal(el);
		action.update?.({ content: 'changed' });
		action.update?.({ content: 'changed again' });

		expect(el.querySelectorAll('button.practice-answer-toggle').length).toBe(1);

		action.destroy?.();
		el.remove();
	});

	it('records a successful attempt when "Rétt hjá mér" is clicked', () => {
		localStorage.clear();
		quizStore.reset();
		const el = makeContainer();
		el.querySelector('aside.note-default')!.id = 'fs-a1';
		practiceReveal(el, { bookSlug: 'b', chapterSlug: '01', sectionSlug: '1-4' });
		el.querySelector<HTMLButtonElement>('button.practice-answer-toggle')!.click(); // reveal
		el.querySelector<HTMLButtonElement>('button.practice-assess-btn[data-success="true"]')!.click();
		const p = get(quizStore).practiceProblemProgress['b/01/1-4#fs-a1'];
		expect(p.attempts).toBe(1);
		expect(p.successfulAttempts).toBe(1);
		el.remove();
	});
});

it('registers the answer with the quiz store on first reveal', () => {
	localStorage.clear();
	quizStore.reset();
	const el = makeContainer(); // answer note has id "fs-a1"
	el.querySelector('aside.note-default')!.id = 'fs-a1';
	practiceReveal(el, {
		bookSlug: 'efnafraedi-2e',
		chapterSlug: '01',
		sectionSlug: '1-4'
	});
	el.querySelector<HTMLButtonElement>('button.practice-answer-toggle')!.dispatchEvent(
		new MouseEvent('click', { bubbles: true })
	);
	const id = 'efnafraedi-2e/01/1-4#fs-a1';
	expect(get(quizStore).practiceProblemProgress[id]).toBeTruthy();
	el.remove();
});
