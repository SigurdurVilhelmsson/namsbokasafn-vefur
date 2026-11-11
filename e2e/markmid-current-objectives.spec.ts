/**
 * /markmid and /nam count only ticks whose objective the table of contents still lists
 * (worklist row sync-objectives-orphan-ticks). efni's H2 empties the objectives of the chapter
 * introductions; a tick a student saved on one stays in storage, but it must not count, be
 * listed or be offered for re-rating. These tests serve the synced toc.json with every
 * introduction's objectives emptied, as H2 ships it, and seed three low-confidence ticks: one on
 * a current objective, one on an introduction, and one past the end of a section's list.
 */
import { expect, test, type Page } from '@playwright/test';
import { objectiveFixture, publishedBook } from './helpers/content-fixtures';

const BOOK = publishedBook();
const FIX = BOOK ? objectiveFixture(BOOK) : null;
const AT = '2026-11-01T00:00:00.000Z';
const INTRO_TEXT = 'E2E: markmið inngangs sem H2 fjarlægir';
const PAST_END_TEXT = 'E2E: markmið aftan við lista kaflans';

// The table of contents must come from the page's own fetch, which page.route sees.
test.use({ serviceWorkers: 'block' });

function seeds(book: string, fix: NonNullable<typeof FIX>) {
	const entry = (chapterSlug: string, sectionSlug: string, objectiveIndex: number, objectiveText: string) => [
		`${book}/${chapterSlug}/${sectionSlug}/${objectiveIndex}`,
		{ chapterSlug, sectionSlug, objectiveIndex, objectiveText, isCompleted: true, completedAt: AT, confidence: 1, assessedAt: AT }
	];
	const { module, introduction } = fix;
	return {
		completedObjectives: Object.fromEntries([
			entry(module.chapter, module.slug, 0, module.objectives[0]),
			entry(introduction.chapter, introduction.slug, 0, INTRO_TEXT),
			entry(module.chapter, module.slug, module.objectives.length + 5, PAST_END_TEXT)
		])
	};
}

async function setUp(page: Page, book: string, fix: NonNullable<typeof FIX>) {
	await page.route(`**/content/${book}/toc.json`, async (route) => {
		const response = await route.fetch();
		const toc = await response.json();
		for (const chapter of toc.chapters) {
			for (const section of chapter.sections) {
				if (section.type === 'introduction' && section.metadata) section.metadata.objectives = [];
			}
		}
		await route.fulfill({ response, json: toc });
	});
	await page.addInitScript((seed) => {
		localStorage.setItem('namsbokasafn:objectives', JSON.stringify(seed));
	}, seeds(book, fix));
}

test.describe('ticks on objectives the table of contents no longer lists', () => {
	test.skip(!BOOK || !FIX, 'no synced book with a section that lists objectives and an introduction');

	test('/markmid counts and lists only the tick on a current objective', async ({ page }) => {
		await setUp(page, BOOK!, FIX!);
		await page.goto(`/${BOOK}/markmid/`);

		// The coverage row waits for the table of contents, so it comes first
		const coverageRow = page.getByText('Metin markmið', { exact: true }).locator('..');
		await expect(coverageRow).toHaveText(new RegExp(`^Metin markmið\\s*1/${FIX!.totalWithoutIntroductions}$`));
		await expect(page.getByRole('heading', { name: 'Framvinda' }).locator('..')).toHaveText(/^Framvinda\s*1$/);

		const lowConfidence = page.getByRole('heading', { name: 'Þarfnast endurskoðunar' }).locator('..');
		await expect(lowConfidence.getByRole('link')).toHaveCount(1);
		await expect(lowConfidence).toContainText(FIX!.module.objectives[0]);

		await expect(page.getByText(INTRO_TEXT)).toHaveCount(0);
		await expect(page.getByText(PAST_END_TEXT)).toHaveCount(0);
	});

	test('/nam offers only the tick on a current objective for re-rating', async ({ page }) => {
		await setUp(page, BOOK!, FIX!);
		await page.goto(`/${BOOK}/nam/`);

		await expect(page.locator('.sp-phase-card', { hasText: 'Sjálfsmat' })).toContainText(/Sjálfsmat\s*1 atriði/);
	});
});
