/**
 * "Vélþýtt" badge on figures whose Icelandic text is not yet approved.
 *
 * efni's renderer marks such a figure with `data-figure-review="mt-preview"` or
 * `"flagged"` and emits nothing once the figure is approved (efni
 * `tools/__tests__/figure-review-attribute.test.js`). efni sends the signal and
 * vefur draws the badge, as a CSS `::before` so that no node is added to the
 * content.
 *
 * Three surfaces, each with its own stylesheet:
 * - the reader on screen (`src/app.css`),
 * - the reader printed with Ctrl+P (`src/app.css`'s `@media print` block),
 * - the PDF routes under `/print/*` (`static/styles/print.css`; the PDF
 *   generator emulates SCREEN media, so the `@media print` block never applies
 *   there).
 *
 * Which figures carry the attribute depends on the synced content, and changes
 * as figures are approved. Each test therefore copies a real figure on the
 * page, sets the attribute on the copy (or removes it, for the control) and
 * inserts it beside the original, where content.css and app.css style it like
 * any other figure.
 */

import { test, expect, type Page } from '@playwright/test';
import { sectionsContaining } from './helpers/content-fixtures';

const BADGE = '"Vélþýtt"';

type Theme = 'light' | 'dark';

/** Reader URL of a section with figures, picked from the synced content. */
const SECTION = sectionsContaining('<figure', 1)[0];

/**
 * Copy the first figure that sits outside header/aside/nav/footer (app.css's
 * print block hides those), give the copy `state` as its review attribute (or
 * none, for the control) and insert it after the original. Returns a locator
 * for the copy.
 */
async function insertFigure(page: Page, state: string | null) {
	const id = `figure-review-fixture-${state ?? 'none'}`;
	await page.waitForSelector('figure');
	await page.evaluate(
		({ id, state }) => {
			const original = [...document.querySelectorAll('figure')].find(
				(f) => !f.closest('header, aside, nav, footer')
			);
			if (!original) throw new Error('No figure outside header/aside/nav/footer');
			const copy = original.cloneNode(true) as HTMLElement;
			copy.id = id;
			copy.removeAttribute('data-figure-review');
			if (state) copy.setAttribute('data-figure-review', state);
			original.after(copy);
		},
		{ id, state }
	);
	return page.locator(`#${id}`);
}

/** Store the theme the way the Settings dialog does, before the page's scripts run. */
async function seedTheme(page: Page, theme: Theme): Promise<void> {
	await page.addInitScript((t) => {
		const key = 'namsbokasafn:settings';
		let stored: Record<string, unknown>;
		try {
			stored = JSON.parse(localStorage.getItem(key) || '{}');
		} catch {
			stored = {};
		}
		localStorage.setItem(key, JSON.stringify({ ...stored, theme: t }));
	}, theme);
}

/**
 * Open the section in a stored theme, and wait until hydration has applied it.
 *
 * Hydration sets the `dark` class from the stored theme twice: the settings store when it
 * loads, then the root layout's theme `$effect`. A class added by hand is safe only after
 * both, which these tests got by waiting for a figure: the section's content renders after
 * the root layout mounts (measured 2026-11-01). Storing the theme instead makes both agree
 * with it, so the tests no longer depend on that order (as in dark-figure-card.spec.ts).
 */
async function openInTheme(page: Page, theme: Theme): Promise<void> {
	await seedTheme(page, theme);
	await page.goto(SECTION);
	const html = page.locator('html');
	const dark = /(^|\s)dark(\s|$)/;
	if (theme === 'dark') await expect(html).toHaveClass(dark, { timeout: 15000 });
	else await expect(html).not.toHaveClass(dark);
}

/** A computed style of the figure's `::before` box. */
function badgeStyle(page: Page, id: string, property: string) {
	return page.evaluate(
		({ id, property }) =>
			getComputedStyle(document.getElementById(id)!, '::before').getPropertyValue(property),
		{ id, property }
	);
}

test.describe('Figure review badge — reader', () => {
	test.skip(!SECTION, 'No synced section with a figure');

	test('a machine-translated figure (mt-preview) is badged', async ({ page }) => {
		await page.goto(SECTION);
		await insertFigure(page, 'mt-preview');
		expect(await badgeStyle(page, 'figure-review-fixture-mt-preview', 'content')).toBe(BADGE);
	});

	test('a flagged figure is badged too', async ({ page }) => {
		await page.goto(SECTION);
		await insertFigure(page, 'flagged');
		expect(await badgeStyle(page, 'figure-review-fixture-flagged', 'content')).toBe(BADGE);
	});

	test('a figure with no review attribute is not badged', async ({ page }) => {
		await page.goto(SECTION);
		await insertFigure(page, null);
		expect(await badgeStyle(page, 'figure-review-fixture-none', 'content')).toBe('none');
	});

	test('the badge has its own colours in dark mode', async ({ page, context }) => {
		const id = 'figure-review-fixture-mt-preview';
		await openInTheme(page, 'light');
		await insertFigure(page, 'mt-preview');
		const light = await badgeStyle(page, id, 'background-color');
		// Each theme in its own page load: switching the class by hand on one page could still
		// be undone by the layout's $effect. Closing the first page first keeps the second
		// page's stored theme from reaching it as a cross-tab change.
		await page.close();
		const darkPage = await context.newPage();
		await openInTheme(darkPage, 'dark');
		await insertFigure(darkPage, 'mt-preview');
		const dark = await badgeStyle(darkPage, id, 'background-color');
		expect(dark).not.toBe(light);
	});

	test('printing the page (Ctrl+P) keeps the badge, with a black border', async ({ page }) => {
		await page.goto(SECTION);
		await insertFigure(page, 'mt-preview');
		await page.emulateMedia({ media: 'print' });
		const id = 'figure-review-fixture-mt-preview';
		expect({
			content: await badgeStyle(page, id, 'content'),
			display: await badgeStyle(page, id, 'display'),
			border: await badgeStyle(page, id, 'border-top-color')
		}).toEqual({ content: BADGE, display: 'block', border: 'rgb(0, 0, 0)' });
	});

	test('printing in dark mode keeps the black border', async ({ page }) => {
		// The .dark rule's selector outranks the print rule's, hence its !important.
		await openInTheme(page, 'dark');
		await insertFigure(page, 'mt-preview');
		await page.emulateMedia({ media: 'print' });
		const id = 'figure-review-fixture-mt-preview';
		expect({
			content: await badgeStyle(page, id, 'content'),
			border: await badgeStyle(page, id, 'border-top-color')
		}).toEqual({ content: BADGE, border: 'rgb(0, 0, 0)' });
	});
});

test.describe('Figure review badge — PDF route', () => {
	test.skip(!SECTION, 'No synced section with a figure');

	test('the /print chapter page keeps the badge in the PDF style', async ({ page }) => {
		// SECTION is /<book>/kafli/<chapter>/<section>/: print that section's chapter.
		const [, book, , chapter] = SECTION.split('/');
		// The generator (scripts/generate-pdfs.js) prints these pages under screen media.
		await page.emulateMedia({ media: 'screen' });
		await page.goto(`/print/${book}/kafli/${chapter}/`);
		await insertFigure(page, 'mt-preview');
		const id = 'figure-review-fixture-mt-preview';
		expect({
			content: await badgeStyle(page, id, 'content'),
			background: await badgeStyle(page, id, 'background-color'),
			color: await badgeStyle(page, id, 'color')
		}).toEqual({ content: BADGE, background: 'rgba(0, 0, 0, 0)', color: 'rgb(68, 68, 68)' });
	});
});
