/**
 * /greining's 7-day chart uses the reader's local dates (code review M7).
 *
 * The daily stats are keyed by local date, but the chart built its keys in UTC: outside UTC,
 * near midnight, it was a day behind (today's reading missing, no bar marked as today).
 * Invisible in Iceland, which is on UTC all year.
 */
import { expect, test } from '@playwright/test';
import { publishedBook } from './helpers/content-fixtures';

const BOOK = publishedBook();

test.use({ timezoneId: 'Pacific/Auckland', serviceWorkers: 'block' });

test("the 7-day chart puts today's reading on today, by the reader's clock", async ({ page }) => {
	test.skip(!BOOK, 'no published book is synced');
	// 19:00 UTC on 1 November is 08:00 on 2 November in Auckland (UTC+13)
	await page.clock.setFixedTime(new Date('2026-11-01T19:00:00Z'));
	await page.addInitScript(() => {
		const today = {
			date: '2026-11-02',
			totalReadingSeconds: 3600,
			sectionsVisited: 1,
			flashcardsReviewed: 0,
			quizzesTaken: 0,
			objectivesCompleted: 0
		};
		localStorage.setItem('namsbokasafn:analytics', JSON.stringify({ dailyStats: { '2026-11-02': today } }));
	});
	await page.goto(`/${BOOK}/greining/`);
	await page.waitForLoadState('networkidle');

	const chart = page.getByRole('heading', { name: 'Síðustu 7 dagar' }).locator('xpath=following-sibling::div[1]');
	const days = chart.locator(':scope > div');
	await expect(days).toHaveCount(7);
	await expect(days.last()).toContainText('1 klst');
});
