/**
 * Practice review shows the whole problem with its maths (plan step S3.1, register PED-12/PED-13).
 *
 * Reveal a Check-your-learning answer in the book, then open /prof: the stored problem must
 * come back whole. Before S3.1 the question was built from <p> siblings only (§4.4's, which
 * ends in an equation, was stored empty) and the answer from textContent, so §3.1's
 * 4,586 × 10²² read '4,586 × 1022'.
 *
 * Assert on elements, never on textContent: the textContent of `10<sup>22</sup>` is '1022'
 * even when it is shown correctly. The sections are found from the content, never by slug
 * (a title correction renames the file).
 */
import { expect, test, type Page } from '@playwright/test';
import { publishedBook, sectionsContaining } from './helpers/content-fixtures';

const BOOK = publishedBook();
/** §3.1: the gold-panning problem ('Au-atóm'), whose answer holds 10<sup>22</sup>. */
const GOLD = sectionsContaining('Au-atóm', 1)[0] ?? null;
/** §4.4: the Freon yield problem, whose question ends in a display equation. */
const FREON = sectionsContaining('gasinu Freon', 1)[0] ?? null;

/** Reveal the Check-your-learning answer in the example containing `marker`, on `url`. */
async function revealAnswer(page: Page, url: string, marker: string): Promise<void> {
	await page.goto(url);
	const answer = page.locator('aside.example', { hasText: marker }).locator('aside.check-knowledge-answer').first();
	await expect(answer).toBeAttached();
	const id = await answer.getAttribute('id');
	expect(id, 'the answer has an id for its toggle to point at').toBeTruthy();
	await page.locator(`button.practice-answer-toggle[aria-controls="${id}"]`).click();
	await expect(answer).toBeVisible();
}

/** /prof's question box: the element after the 'Dæmi N' label (markup that predates S3.1, so the test fails on the content, not on a selector). */
const question = (page: Page) => page.locator('h4.aq-problem-label + div');

test.describe('Practice review keeps the whole problem (S3.1)', () => {
	test.use({ serviceWorkers: 'block' });

	test('a power of ten in an answer reaches /prof as an element (§3.1 gold atoms)', async ({ page }) => {
		test.skip(!BOOK || !GOLD, 'the gold-atoms problem is not in this content sync');
		await revealAnswer(page, GOLD!, 'Au-atóm');

		await page.goto(`/${BOOK}/prof/`);
		await expect(question(page)).toContainText('Au-atóm');
		await page.getByRole('button', { name: /Sýna svar/ }).click();
		const answer = page.locator('.aq-answer-text');
		await expect(answer.locator('sup', { hasText: /^22$/ })).toHaveCount(1);
		// The × between 4,586 and 10 is MathML now, shown by the browser, not a hidden copy.
		await expect(answer.locator('math')).not.toHaveCount(0);
		await expect(answer.locator('svg, mjx-container, [style]')).toHaveCount(0);
		await expect(answer).not.toContainText('Svar:');
	});

	test('a question that ends in an equation reaches /prof whole, without the page controls (§4.4)', async ({ page }) => {
		test.skip(!BOOK || !FREON, 'the Freon problem is not in this content sync');
		await revealAnswer(page, FREON!, 'gasinu Freon');

		await page.goto(`/${BOOK}/prof/`);
		const q = question(page);
		await expect(q).toContainText('prósentunýtni');
		await expect(q.locator('math[display="block"]')).toHaveCount(1);
		await expect(q.locator('sub')).not.toHaveCount(0);
		// The live page adds 'LaTeX', '🔗' and '⊕' buttons to every equation (equations.ts).
		await expect(q.locator('button')).toHaveCount(0);
		await expect(q).not.toContainText('LaTeX');
	});
});
