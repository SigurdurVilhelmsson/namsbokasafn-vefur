/**
 * Tests for the print chapter's exercise ↔ answer links (PDF plan Task 3.3).
 *
 * The fixtures copy efni's markup: an `.eoc-exercise` and its `.answer-entry` carry the
 * same `id` and `data-exercise-id`, and the answer key comes last, as the print chapter
 * loader appends it. Each output is parsed as one document, because that is what
 * Chromium resolves `#id` against when it prints the chapter.
 */

import { describe, it, expect } from 'vitest';
import {
	linkExercisesToAnswers,
	exerciseAnchorId,
	answerAnchorId,
	type PrintAnswerBlock
} from './printAnswers';

interface ExerciseSpec {
	id: string;
	n?: string;
	has?: 'true' | 'false';
}

function exercise({ id, n, has }: ExerciseSpec): string {
	const num = n === undefined ? '' : ` data-exercise-number="${n}"`;
	const ans = has === undefined ? '' : ` data-has-answer="${has}"`;
	return (
		`<div id="${id}" class="eoc-exercise" data-exercise-id="${id}"${num}${ans}>` +
		`<div id="${id}-p" class="problem"><p>Dæmi ${n ?? ''}</p></div></div>`
	);
}

function answer(id: string, n?: string): string {
	const num = n === undefined ? '' : ` data-exercise-number="${n}"`;
	return (
		`<div class="answer-entry" id="${id}" data-exercise-id="${id}"${num}>` +
		`<p>Svar ${n ?? ''}</p></div>`
	);
}

function exercisesBlock(...specs: ExerciseSpec[]): PrintAnswerBlock {
	return {
		type: 'exercises',
		content:
			'<article class="chapter-resource exercises"><main><section class="exercises-section">' +
			specs.map(exercise).join('\n') +
			'</section></main></article>'
	};
}

function answerKeyBlock(...entries: Array<[string, string?]>): PrintAnswerBlock {
	return {
		type: 'answer-key',
		content:
			'<article class="chapter-resource answer-key"><main><div class="answers-list">' +
			entries.map(([id, n]) => answer(id, n)).join('\n') +
			'</div></main></article>'
	};
}

/** The chapter as Chromium sees it: every block in one document. */
function render(blocks: PrintAnswerBlock[]): Document {
	const html = blocks.map((b) => b.content).join('\n');
	return new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
}

function forwardLinks(doc: Document): HTMLAnchorElement[] {
	return [...doc.querySelectorAll<HTMLAnchorElement>('.eoc-exercise > a.print-answer-link')];
}

function backLinks(doc: Document): HTMLAnchorElement[] {
	return [...doc.querySelectorAll<HTMLAnchorElement>('.answer-entry > a.print-exercise-link')];
}

/** Every element that `href="#name"` could resolve to. */
function targetsOf(doc: Document, link: HTMLAnchorElement): Element[] {
	const name = link.getAttribute('href')!.slice(1);
	return [...doc.querySelectorAll('[id]')].filter((el) => el.id === name);
}

describe('linkExercisesToAnswers', () => {
	it('links an answered exercise to its answer and the answer back to it', () => {
		const doc = render(
			linkExercisesToAnswers(
				[exercisesBlock({ id: 'fs-a', n: '1', has: 'true' }), answerKeyBlock(['fs-a', '1'])],
				'01'
			)
		);
		const [fwd] = forwardLinks(doc);
		const [back] = backLinks(doc);
		expect(fwd).toBeDefined();
		expect(back).toBeDefined();
		expect(fwd.getAttribute('href')).toBe(`#${answerAnchorId('01', 'fs-a')}`);
		expect(back.getAttribute('href')).toBe(`#${exerciseAnchorId('01', 'fs-a')}`);
		// Each lands on exactly one element, inside the other half of the pair.
		expect(targetsOf(doc, fwd)).toHaveLength(1);
		expect(targetsOf(doc, fwd)[0].closest('.answer-entry')?.getAttribute('data-exercise-id')).toBe(
			'fs-a'
		);
		expect(targetsOf(doc, back)).toHaveLength(1);
		expect(targetsOf(doc, back)[0].closest('.eoc-exercise')?.getAttribute('data-exercise-id')).toBe(
			'fs-a'
		);
	});

	it('targets ids of its own, because the exercise and its answer share the content id', () => {
		const blocks = [
			exercisesBlock({ id: 'fs-a', n: '1', has: 'true' }),
			answerKeyBlock(['fs-a', '1'])
		];
		// The control: efni's own id names two elements, and getElementById finds the exercise.
		const before = render(blocks);
		expect(before.querySelectorAll('[id="fs-a"]')).toHaveLength(2);
		expect(before.getElementById('fs-a')?.classList.contains('eoc-exercise')).toBe(true);

		const doc = render(linkExercisesToAnswers(blocks, '01'));
		const links = [...forwardLinks(doc), ...backLinks(doc)];
		expect(links).toHaveLength(2);
		for (const link of links) {
			expect(link.getAttribute('href')).not.toBe('#fs-a');
			expect(targetsOf(doc, link)).toHaveLength(1);
		}
		// The content's own ids are left as they were.
		expect(doc.querySelectorAll('[id="fs-a"]')).toHaveLength(2);
	});

	it('scopes the anchors, so the same content id in two chapters gives two names', () => {
		const ch = () => [
			exercisesBlock({ id: 'fs-same', n: '1', has: 'true' }),
			answerKeyBlock(['fs-same', '1'])
		];
		const one = render(linkExercisesToAnswers(ch(), '01'));
		const two = render(linkExercisesToAnswers(ch(), '02'));
		const names = (doc: Document) =>
			[...forwardLinks(doc), ...backLinks(doc)].map((a) => a.getAttribute('href'));
		expect(names(one)).toHaveLength(2);
		expect(names(two)).toHaveLength(2);
		for (const name of names(one)) expect(names(two)).not.toContain(name);
	});

	it('uses the number and the reader’s labels, and marks the entry so print.css hides its ::before', () => {
		const doc = render(
			linkExercisesToAnswers(
				[exercisesBlock({ id: 'fs-a', n: '7', has: 'true' }), answerKeyBlock(['fs-a', '7'])],
				'03'
			)
		);
		const [fwd] = forwardLinks(doc);
		const [back] = backLinks(doc);
		expect(fwd.textContent).toBe('7.');
		expect(back.textContent).toBe('7.');
		expect(fwd.getAttribute('aria-label')).toBe('Fara í svar við æfingu 7');
		expect(back.getAttribute('aria-label')).toBe('Fara í æfingu 7');
		// The link is the first child, where the reader puts its number link.
		expect(fwd.parentElement?.firstElementChild).toBe(fwd);
		expect(back.parentElement?.firstElementChild).toBe(back);
		expect(fwd.parentElement?.classList.contains('print-linked')).toBe(true);
		expect(back.parentElement?.classList.contains('print-linked')).toBe(true);
		// The original classes stay.
		expect(fwd.parentElement?.classList.contains('eoc-exercise')).toBe(true);
		expect(back.parentElement?.classList.contains('answer-entry')).toBe(true);
	});

	it('never links an exercise marked data-has-answer="false", either way', () => {
		const doc = render(
			linkExercisesToAnswers(
				[
					exercisesBlock({ id: 'fs-a', n: '1', has: 'true' }, { id: 'fs-b', n: '2', has: 'false' }),
					// An answer entry for fs-b would be a content defect; it still gets no link.
					answerKeyBlock(['fs-a', '1'], ['fs-b', '2'])
				],
				'01'
			)
		);
		expect(forwardLinks(doc).map((a) => a.textContent)).toEqual(['1.']);
		expect(backLinks(doc).map((a) => a.textContent)).toEqual(['1.']);
	});

	it('does not link an answered exercise whose answer is not in the render', () => {
		const blocks = [
			exercisesBlock({ id: 'fs-a', n: '1', has: 'true' }, { id: 'fs-c', n: '3', has: 'true' }),
			answerKeyBlock(['fs-a', '1'])
		];
		const doc = render(linkExercisesToAnswers(blocks, '01'));
		expect(forwardLinks(doc).map((a) => a.textContent)).toEqual(['1.']);
		// With no answer key at all, nothing links.
		const noKey = [blocks[0]];
		expect(linkExercisesToAnswers(noKey, '01')).toBe(noKey);
	});

	it('does not link an answer whose exercise is not in the render', () => {
		const doc = render(
			linkExercisesToAnswers(
				[
					exercisesBlock({ id: 'fs-a', n: '1', has: 'true' }),
					answerKeyBlock(['fs-a', '1'], ['fs-gone', '9'])
				],
				'01'
			)
		);
		expect(backLinks(doc).map((a) => a.textContent)).toEqual(['1.']);
		expect(doc.querySelector('[data-exercise-id="fs-gone"] a')).toBeNull();
	});

	it('leaves no link pointing at a missing target', () => {
		const doc = render(
			linkExercisesToAnswers(
				[
					exercisesBlock(
						{ id: 'fs-a', n: '1', has: 'true' },
						{ id: 'fs-b', n: '2', has: 'false' },
						{ id: 'fs-c', n: '3', has: 'true' },
						{ id: 'fs-d', n: '4' }
					),
					answerKeyBlock(['fs-a', '1'], ['fs-d', '4'], ['fs-gone', '9'])
				],
				'01'
			)
		);
		const links = [...forwardLinks(doc), ...backLinks(doc)];
		expect(links).toHaveLength(4);
		for (const link of links) expect(targetsOf(doc, link)).toHaveLength(1);
	});

	it('without data-has-answer, links where the answer is in the render, not by parity', () => {
		const doc = render(
			linkExercisesToAnswers(
				[
					// No attribute: a page rendered before efni wrote it. An even number with an
					// answer, and an odd number without one, the cases parity gets wrong.
					exercisesBlock({ id: 'fs-even', n: '12' }, { id: 'fs-odd', n: '13' }),
					answerKeyBlock(['fs-even', '12'])
				],
				'12'
			)
		);
		expect(forwardLinks(doc).map((a) => a.textContent)).toEqual(['12.']);
		expect(backLinks(doc).map((a) => a.textContent)).toEqual(['12.']);
	});

	it('links every copy of a repeated exercise, and the answer back to the exercises page copy', () => {
		const section: PrintAnswerBlock = {
			type: 'section',
			content: `<article class="cnx-module">${exercise({ id: 'fs-r', n: '5', has: 'true' })}</article>`
		};
		const doc = render(
			linkExercisesToAnswers(
				[
					section,
					exercisesBlock({ id: 'fs-r', n: '5', has: 'true' }),
					answerKeyBlock(['fs-r', '5'])
				],
				'11'
			)
		);
		const fwd = forwardLinks(doc);
		expect(fwd).toHaveLength(2);
		for (const link of fwd) expect(targetsOf(doc, link)).toHaveLength(1);
		const [back] = backLinks(doc);
		const targets = targetsOf(doc, back);
		expect(targets).toHaveLength(1);
		expect(targets[0].closest('article')?.classList.contains('exercises')).toBe(true);
	});

	it('gives a repeated answer entry one target, and links every copy back', () => {
		const doc = render(
			linkExercisesToAnswers(
				[exercisesBlock({ id: 'fs-a', n: '1', has: 'true' }), answerKeyBlock(['fs-a', '1'], ['fs-a', '1'])],
				'01'
			)
		);
		// Exactly one element carries the answer's anchor, and it is the first copy's link.
		const anchors = [...doc.querySelectorAll('[id]')].filter(
			(el) => el.id === answerAnchorId('01', 'fs-a')
		);
		expect(anchors).toHaveLength(1);
		expect(anchors[0].closest('.answer-entry')).toBe(doc.querySelectorAll('.answer-entry')[0]);
		// Both copies link back to the exercise.
		const back = backLinks(doc);
		expect(back).toHaveLength(2);
		for (const link of back) expect(targetsOf(doc, link)).toHaveLength(1);
		// The forward link has one place to land.
		const [fwd] = forwardLinks(doc);
		expect(targetsOf(doc, fwd)).toHaveLength(1);
	});

	it('falls back to the first copy when no copy is on the exercises page', () => {
		const section = (n: number): PrintAnswerBlock => ({
			type: 'section',
			content: `<article class="cnx-module" data-n="${n}">${exercise({ id: 'fs-r', n: '5', has: 'true' })}</article>`
		});
		const doc = render(
			linkExercisesToAnswers([section(1), section(2), answerKeyBlock(['fs-r', '5'])], '11')
		);
		const [back] = backLinks(doc);
		const targets = targetsOf(doc, back);
		expect(targets).toHaveLength(1);
		expect(targets[0].closest('article')?.getAttribute('data-n')).toBe('1');
	});

	it('leaves an exercise or answer with no number unlinked', () => {
		const doc = render(
			linkExercisesToAnswers(
				[
					exercisesBlock({ id: 'fs-a', n: '1', has: 'true' }, { id: 'fs-x', has: 'true' }),
					answerKeyBlock(['fs-a', '1'], ['fs-x', '2'], ['fs-y'])
				],
				'01'
			)
		);
		expect(forwardLinks(doc).map((a) => a.textContent)).toEqual(['1.']);
		expect(backLinks(doc).map((a) => a.textContent)).toEqual(['1.']);
	});

	it('pairs on id when there is no data-exercise-id, never on the tail of another attribute', () => {
		const blocks: PrintAnswerBlock[] = [
			{
				type: 'exercises',
				content:
					'<div data-problem-id="fs-other" id="fs-a" class="eoc-exercise" data-exercise-number="1" data-has-answer="true"><p>Dæmi</p></div>'
			},
			{
				type: 'answer-key',
				content: '<div class="answer-entry" id="fs-a" data-exercise-number="1"><p>Svar</p></div>'
			}
		];
		const doc = render(linkExercisesToAnswers(blocks, '01'));
		expect(forwardLinks(doc).map((a) => a.getAttribute('href'))).toEqual([
			`#${answerAnchorId('01', 'fs-a')}`
		]);
		expect(backLinks(doc)).toHaveLength(1);
	});

	it('reads exercises only outside the answer key and answers only inside it', () => {
		// An answer-entry in a section is not an answer the answer key holds.
		const stray: PrintAnswerBlock = { type: 'section', content: answer('fs-b', '2') };
		const out = linkExercisesToAnswers(
			[
				exercisesBlock({ id: 'fs-a', n: '1', has: 'true' }, { id: 'fs-b', n: '2', has: 'true' }),
				stray,
				answerKeyBlock(['fs-a', '1'])
			],
			'01'
		);
		const doc = render(out);
		expect(forwardLinks(doc).map((a) => a.textContent)).toEqual(['1.']);
		expect(out[1]).toBe(stray);
	});

	it('keeps the other fields of a block, and returns an unchanged block as is', () => {
		const intro = {
			type: 'introduction',
			content: '<article class="cnx-module"><p>Inngangur</p></article>',
			title: 'Inngangur'
		};
		const ex = { ...exercisesBlock({ id: 'fs-a', n: '1', has: 'true' }), title: 'Æfingar' };
		const key = { ...answerKeyBlock(['fs-a', '1']), title: 'Svarlykill' };
		const out = linkExercisesToAnswers([intro, ex, key], '01');
		expect(out[0]).toBe(intro);
		expect(out[1]).not.toBe(ex);
		expect(out[1].title).toBe('Æfingar');
		expect(out[2].title).toBe('Svarlykill');
	});
});
