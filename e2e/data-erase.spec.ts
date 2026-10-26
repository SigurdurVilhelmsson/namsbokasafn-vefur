/**
 * Honest data controls (plan step S3.2, register PED-14 and PED-29).
 *
 * - /greining's 'Eyða öllum gögnum á þessu tæki' erases everything the site keeps in this
 *   browser: every namsbokasafn key, the downloaded books and the browsing caches, then reloads.
 *   The stores write their defaults back on the reload, so the test checks that no key still
 *   holds seeded data, not that the keys are gone.
 * - 'Hreinsa tölfræði' (it was 'Hreinsa gögn') says what it clears, and that the rest stays.
 * - /prof no longer claims to adapt the next question.
 */
import { expect, test, type Page } from '@playwright/test';
import { firstModuleSection, publishedBook } from './helpers/content-fixtures';

const BOOK = publishedBook();
const SECTION = BOOK ? firstModuleSection(BOOK) : null;
const MARK = 'e2e-erase-seed';
const AT = '2026-10-01T00:00:00.000Z';

/** One record per store, each holding MARK in a field the store keeps when it validates its data on load. */
function seeds(book: string, chapter: string, section: string): Record<string, unknown> {
	const sectionId = `${book}/${chapter}/${section}`;
	return {
		'namsbokasafn:reader': {
			progress: { [sectionId]: { read: true, lastVisited: AT, seed: MARK } },
			currentChapter: null,
			currentSection: null,
			bookmarks: [sectionId],
			scrollProgress: 0,
			scrollPositions: {}
		},
		'namsbokasafn:flashcards': {
			decks: [{ id: MARK, name: MARK, cards: [{ id: `${MARK}-1`, front: 'A', back: 'B', created: AT }], created: AT }]
		},
		'namsbokasafn:annotations': {
			annotations: [
				{ id: MARK, bookSlug: book, chapterSlug: chapter, sectionSlug: section, selectedText: MARK, range: {}, color: 'yellow', createdAt: AT, updatedAt: AT }
			]
		},
		'namsbokasafn:objectives': { completedObjectives: { [`${sectionId}/${MARK}`]: { completedAt: AT } } },
		'namsbokasafn:quiz': {
			practiceProblemProgress: {
				[`${sectionId}#${MARK}`]: {
					id: `${sectionId}#${MARK}`,
					content: MARK,
					answer: 'x',
					bookSlug: book,
					chapterSlug: chapter,
					sectionSlug: section,
					source: 'inline',
					isCompleted: false,
					attempts: 1,
					successfulAttempts: 0
				}
			}
		},
		'namsbokasafn:analytics': {
			sectionReadingTimes: { [sectionId]: 600 },
			activityLog: [{ id: MARK, type: 'reading', timestamp: new Date().toISOString(), details: { bookSlug: book, chapterSlug: chapter, sectionSlug: section } }],
			goals: [{ id: MARK, type: 'daily_reading_time', target: 30, unit: 'minutes', createdAt: AT, isActive: true }]
		},
		'namsbokasafn:offline': { books: { [book]: { downloaded: true, downloadedAt: AT, version: MARK, sizeBytes: 1000 } } }
	};
}

/** Every namsbokasafn key and its raw value. */
const storedKeys = (page: Page) =>
	page.evaluate(() =>
		Object.fromEntries(
			Object.keys(localStorage)
				.filter((k) => k.startsWith('namsbokasafn'))
				.map((k) => [k, localStorage.getItem(k) ?? ''])
		)
	);

test.describe('Honest data controls (S3.2)', () => {
	test.use({ serviceWorkers: 'block' });

	test("'Eyða öllum gögnum á þessu tæki' erases every key, the downloads and their caches, then reloads", async ({ page }) => {
		test.skip(!SECTION, 'no published book is synced');
		const [, chapter, section] = SECTION!.match(/\/kafli\/([^/]+)\/([^/]+)\//)!;
		const data = seeds(BOOK!, chapter, section);
		// Seed once: the reload after the erase must not seed again.
		await page.addInitScript((d) => {
			if (sessionStorage.getItem('e2e-erase-seeded')) return;
			sessionStorage.setItem('e2e-erase-seeded', '1');
			for (const [k, v] of Object.entries(d)) localStorage.setItem(k, JSON.stringify(v));
		}, data);

		await page.goto(`/${BOOK}/greining/`);
		await page.waitForLoadState('networkidle');
		// Each store validates its data on load and drops what it rejects: without this check, a
		// rejected seed would make the test pass without erasing anything.
		const before = await storedKeys(page);
		for (const key of Object.keys(data)) expect(before[key], `${key} kept its seed`).toContain(MARK);
		await expect(page.getByText('Engin virkni skráð enn.')).toHaveCount(0);

		// A downloaded book's files, in its cache.
		await page.evaluate(async (book) => {
			const cache = await caches.open(`offline-book:${book}`);
			await cache.put('/e2e-erase-probe', new Response('x'));
		}, BOOK!);
		expect(await page.evaluate(() => caches.keys())).toContain(`offline-book:${BOOK}`);

		const messages: string[] = [];
		page.on('dialog', (dialog) => {
			messages.push(dialog.message());
			void dialog.accept();
		});
		const reloaded = page.waitForEvent('load');
		await page.getByRole('button', { name: 'Eyða öllum gögnum á þessu tæki' }).click();
		await reloaded;
		expect(messages[0]).toContain('Niðurhalaðar bækur eyðast líka');

		const after = await storedKeys(page);
		for (const [key, value] of Object.entries(after)) expect(value, `${key} after the erase`).not.toContain(MARK);
		expect((await page.evaluate(() => caches.keys())).filter((n) => n.startsWith('offline-book:'))).toEqual([]);
		expect(JSON.parse(after['namsbokasafn:offline'] ?? '{"books":{}}').books[BOOK!]).toBeUndefined();

		await expect(page.getByText('Engin virkni skráð enn.')).toBeVisible();
		await page.goto(`/${BOOK}/bokamerki/`);
		await expect(page.getByText('Engin bókamerki')).toBeVisible();
		await page.goto(`/${BOOK}/minniskort/`);
		await expect(page.getByText('Engin minniskort enn')).toBeVisible();
	});

	// Normally the reloaded page writes every store's defaults, which also resets other tabs. When
	// that reload fails (offline, no page is precached), another open tab must still drop the
	// erased data when it sees the removals, not write it back on its next change.
	test('another open tab drops the erased data, even when the reload fails', async ({ context, page }) => {
		test.skip(!SECTION, 'no published book is synced');
		const [, chapter, section] = SECTION!.match(/\/kafli\/([^/]+)\/([^/]+)\//)!;
		await context.addInitScript((d) => {
			if (sessionStorage.getItem('e2e-erase-seeded')) return;
			sessionStorage.setItem('e2e-erase-seeded', '1');
			for (const [k, v] of Object.entries(d)) localStorage.setItem(k, JSON.stringify(v));
		}, seeds(BOOK!, chapter, section));

		const reading = await context.newPage();
		await reading.goto(SECTION!);
		await expect(reading.locator('.reading-content')).toBeVisible();
		await page.goto(`/${BOOK}/greining/`);
		await page.waitForLoadState('networkidle');
		expect((await storedKeys(page))['namsbokasafn:reader']).toContain(MARK);

		// The erasing tab's reload fails, as it would offline.
		await page.route((url) => url.pathname.includes('/greining'), (route) => route.abort());
		page.on('dialog', (dialog) => void dialog.accept());
		await page.getByRole('button', { name: 'Eyða öllum gögnum á þessu tæki' }).click();
		await expect.poll(async () => Object.keys(await storedKeys(reading))).not.toContain('namsbokasafn:reader');

		// Scrolling makes the reading tab save its reader state again.
		await reading.mouse.wheel(0, 1500);
		await expect.poll(async () => (await storedKeys(reading))['namsbokasafn:reader'] ?? '').not.toBe('');
		expect((await storedKeys(reading))['namsbokasafn:reader']).not.toContain(MARK);
	});

	test("'Hreinsa tölfræði' says what it clears and what stays", async ({ page }) => {
		test.skip(!BOOK, 'no published book is synced');
		await page.goto(`/${BOOK}/greining/`);
		await page.waitForLoadState('networkidle');
		let message = '';
		page.once('dialog', (dialog) => {
			message = dialog.message();
			void dialog.dismiss();
		});
		await page.getByRole('button', { name: 'Hreinsa tölfræði' }).click();
		await expect.poll(() => message).toContain('Námsmarkmið');
		expect(message).toContain('haldast');
		expect(message).not.toContain('öllum námsupplýsingum');
	});

	test('/prof does not claim to adapt the next question', async ({ page }) => {
		test.skip(!BOOK, 'no published book is synced');
		await page.goto(`/${BOOK}/prof/`);
		await expect(page.locator('h1')).toHaveText('Próf');
		// PED-29: the heading and the nav entry that leads here say the same thing.
		await expect(page.locator(`a[href^="/${BOOK}/prof"]`).first()).toContainText('Próf');
		await expect(page.locator('.quiz-subtext')).not.toContainText('Aðlagað');
		await expect(page.locator('.quiz-help')).not.toContainText(/aðlög/i);
		await expect(page).toHaveTitle(/^Próf \|/);
	});
});
