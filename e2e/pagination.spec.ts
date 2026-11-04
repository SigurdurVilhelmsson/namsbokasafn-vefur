/**
 * Paged reading mode (reader plan P0.4)
 *
 * Paged is the default reading mode: a section renders as viewport-fitting
 * pages with Fyrri/Næsta navigation instead of one long scroll.
 */

import { test, expect, type Page } from '@playwright/test';
import { ATOMIC_SELECTOR } from '../src/lib/utils/paginate';
import { sectionsContaining, rollupSection } from './helpers/content-fixtures';

/** Click through landing → book → first section. Returns false when the
 *  synced content needed for the journey isn't present. */
async function openFirstSection(page: Page): Promise<boolean> {
	await page.goto('/');
	await page.waitForLoadState('networkidle');

	const bookLink = page.getByRole('link', { name: /Efnafræði/i }).first();
	if (!(await bookLink.isVisible({ timeout: 10000 }).catch(() => false))) return false;
	await bookLink.click();
	// A client-side navigation keeps the document, so networkidle can resolve
	// before it starts; without this wait the chapter-link lookup below ran on
	// the landing page, found nothing and SKIPPED the test (2 of 3 skipped).
	await expect(page).toHaveURL(/\/efnafraedi-2e\//);
	await page.waitForLoadState('networkidle');

	const sectionLink = page.locator('a[href*="/kafli/"]').first();
	if (!(await sectionLink.isVisible({ timeout: 10000 }).catch(() => false))) return false;
	await sectionLink.click();
	await expect(page).toHaveURL(/\/kafli\/.+\/.+/);
	await page.waitForLoadState('networkidle');
	return true;
}

test.describe('Paged reading mode', () => {
	test('shows pagination controls on a section page', async ({ page }) => {
		test.skip(!(await openFirstSection(page)), 'No section content available');

		const nav = page.getByRole('navigation', { name: 'Síðuflakk' });
		await expect(nav).toBeVisible({ timeout: 15000 });
		await expect(nav.getByText(/Hluti \d+ af \d+/)).toBeVisible();
	});

	test('Næsta advances and updates the position label and hash', async ({ page }) => {
		test.skip(!(await openFirstSection(page)), 'No section content available');

		const nav = page.getByRole('navigation', { name: 'Síðuflakk' });
		await expect(nav).toBeVisible({ timeout: 15000 });

		const label = nav.locator('.paged-nav-label');
		const before = await label.textContent();

		const nextButton = nav.getByRole('button', { name: 'Næsta síða' });
		test.skip(await nextButton.isDisabled(), 'Section fits a single page');
		await nextButton.click();

		await expect(label).not.toHaveText(before ?? '', { timeout: 5000 });
		await expect(page).toHaveURL(/#sub-\d+(-p-\d+)?$/);

		// Fyrri returns to the start
		await nav.getByRole('button', { name: 'Fyrri síða' }).click();
		await expect(label).toHaveText(before ?? '', { timeout: 5000 });
	});

	// The point of paged mode: no scrolling within a page. Sums the heights of
	// the content blocks visible on each page (the chrome around the page is
	// not counted, as the paginator's own budget leaves room for it). The one
	// designed exception: a page holding a single block taller than the window.
	// The paginator splits between blocks, never inside one, so a long worked
	// example, a big table or a long flat list (the preface's 60 reviewers)
	// keeps a page of its own and scrolls there. The test splits <main> and
	// nested <section>s itself before counting, so a wrapper the paginator
	// wrongly took as one block shows up as many blocks and still fails.
	test('every page of a section fits the viewport', async ({ page }) => {
		test.skip(!(await openFirstSection(page)), 'No section content available');

		const nav = page.getByRole('navigation', { name: 'Síðuflakk' });
		await expect(nav).toBeVisible();
		const next = nav.getByRole('button', { name: 'Næsta síða' });

		for (let i = 0; i < 40; i++) {
			const { visible, count, headed, atomic, viewport } = await page.evaluate((atomicSelector) => {
				const root = document.querySelector('article.cnx-module') as HTMLElement;
				const main = root.querySelector(':scope > main');
				const flat = (el: Element): Element[] =>
					el.tagName === 'SECTION' ? Array.from(el.children).flatMap(flat) : [el];
				const blocks = [
					...Array.from(root.children).filter((el) => el.tagName !== 'MAIN'),
					...(main ? Array.from(main.children) : [])
				].flatMap(flat);
				const shown = blocks.filter((el) => (el as HTMLElement).offsetParent !== null);
				return {
					visible: shown.reduce((sum, el) => sum + el.getBoundingClientRect().height, 0),
					count: shown.length,
					// Headings followed by one block: kept together even when they
					// overrun, rather than strand the heading on a page of its own
					headed: shown.slice(0, -1).every((el) => /^H[2-4]$/.test(el.tagName)),
					atomic: shown.length === 1 && shown[0].matches(atomicSelector),
					viewport: window.innerHeight
				};
			}, ATOMIC_SELECTOR);
			const ok = visible <= viewport || count === 1 || headed;
			expect(
				ok,
				`page ${i + 1}: ${Math.round(visible)}px of content in ${count} block(s) in a ${viewport}px window${atomic ? ' (unsplittable)' : ''}`
			).toBe(true);
			if (await next.isDisabled()) break;
			await next.click();
			await page.waitForTimeout(300);
		}
	});

	test('continuous-scroll setting restores the scrolled experience', async ({ page }) => {
		test.skip(!(await openFirstSection(page)), 'No section content available');

		const nav = page.getByRole('navigation', { name: 'Síðuflakk' });
		await expect(nav).toBeVisible({ timeout: 15000 });

		// Switch to "Samfellt skrun" via localStorage (the settings store
		// persists there) and reload — the controls must disappear and no
		// content block may remain hidden
		await page.evaluate(() => {
			const raw = localStorage.getItem('namsbokasafn:settings');
			const state = raw ? JSON.parse(raw) : {};
			state.readingMode = 'scrolled';
			localStorage.setItem('namsbokasafn:settings', JSON.stringify(state));
		});
		await page.reload();
		// Not networkidle: after a reload the service worker can keep the
		// network busy past 30 s (it timed out once in a full-suite run).
		// Wait for the content, then for what the paginator itself waits for
		// (fonts) plus a margin, so "no controls" cannot pass merely because
		// paged mode had not drawn them yet.
		await expect(page.locator('.reading-content')).toBeVisible();
		await page.evaluate(() => document.fonts.ready);
		await page.waitForTimeout(1000);

		await expect(page.getByRole('navigation', { name: 'Síðuflakk' })).toHaveCount(0);
		await expect(page.locator('.reading-content [hidden]')).toHaveCount(0);
	});

	// The tests below each failed before the fix they guard (QA 2026-10-03,
	// batch E items E1, E2, E6, E8, E18 and E19).

	/** True when the shown page is an overrun the paginator allows: one block
	 *  taller than a page, or headings kept with the one block after them. */
	async function allowedOverrun(page: Page): Promise<boolean> {
		return page.evaluate(() => {
			const root = document.querySelector('article.cnx-module') as HTMLElement;
			const main = root.querySelector(':scope > main');
			const flat = (el: Element): Element[] =>
				el.tagName === 'SECTION' ? Array.from(el.children).flatMap(flat) : [el];
			const shown = [
				...Array.from(root.children).filter((el) => el.tagName !== 'MAIN'),
				...(main ? Array.from(main.children) : [])
			]
				.flatMap(flat)
				.filter((el) => (el as HTMLElement).offsetParent !== null);
			return shown.slice(0, -1).every((el) => /^H[2-4]$/.test(el.tagName));
		});
	}

	test('page 1 shows its controls on arrival', async ({ page }) => {
		const urls = sectionsContaining('<p', 3);
		test.skip(urls.length === 0, 'No section content available');

		for (const url of urls) {
			await page.goto(url);
			const nav = page.getByRole('navigation', { name: 'Síðuflakk' });
			await expect(nav).toBeVisible({ timeout: 15000 });
			await page.waitForTimeout(500);
			const { bottom, height } = await nav.evaluate((el) => ({
				bottom: el.getBoundingClientRect().bottom,
				height: window.innerHeight
			}));
			if (await allowedOverrun(page)) continue;
			expect(bottom, `${url}: controls end at ${Math.round(bottom)}px`).toBeLessThanOrEqual(height);
		}
	});

	test('← and → turn pages, not sections', async ({ page }) => {
		const urls = sectionsContaining('<p', 1);
		test.skip(urls.length === 0, 'No section content available');

		await page.goto(urls[0]);
		const nav = page.getByRole('navigation', { name: 'Síðuflakk' });
		await expect(nav).toBeVisible({ timeout: 15000 });
		const label = nav.locator('.paged-nav-label');
		const first = (await label.textContent())!.trim();
		const path = new URL(page.url()).pathname;

		await page.locator('body').click({ position: { x: 5, y: 5 } });
		await page.keyboard.press('ArrowRight');
		await expect(label).not.toHaveText(first);
		expect(new URL(page.url()).pathname).toBe(path);
		await page.keyboard.press('ArrowLeft');
		await expect(label).toHaveText(first);
	});

	test('the page count does not change while a page is read', async ({ page }) => {
		const urls = sectionsContaining('<img', 1);
		test.skip(urls.length === 0, 'No section with images');
		test.setTimeout(180000);

		await page.goto(urls[0]);
		const nav = page.getByRole('navigation', { name: 'Síðuflakk' });
		await expect(nav).toBeVisible({ timeout: 15000 });
		const label = nav.locator('.paged-nav-label');
		const next = nav.getByRole('button', { name: 'Næsta síða' });
		const changes: string[] = [];

		for (let i = 0; i < 40; i++) {
			const before = (await label.textContent())!.trim();
			await page.waitForTimeout(1200);
			const after = (await label.textContent())!.trim();
			if (after !== before) changes.push(`${before} -> ${after}`);
			if (await next.isDisabled()) break;
			await next.click();
			await expect(label).not.toHaveText(after);
		}
		expect(changes).toEqual([]);
	});

	test('a cross-reference keeps its target on screen', async ({ page }) => {
		const urls = sectionsContaining('<img', 10);
		test.skip(urls.length === 0, 'No section with images');
		test.setTimeout(180000);

		// A link inside the content to a figure with an image, on a later page
		let found: { id: string; url: string } | null = null;
		for (const url of urls) {
			await page.goto(url);
			await expect(page.getByRole('navigation', { name: 'Síðuflakk' })).toBeVisible({
				timeout: 15000
			});
			const id = await page.evaluate(() => {
				const links = document.querySelectorAll<HTMLAnchorElement>(
					'article.cnx-module a[href^="#"]'
				);
				for (const a of links) {
					const t = document.getElementById(decodeURIComponent(a.hash.slice(1)));
					if (t?.matches('figure') && t.querySelector('img') && !t.contains(a)) return t.id;
				}
				return null;
			});
			if (id) {
				found = { id, url };
				break;
			}
		}
		test.skip(!found, 'No in-section link to an image figure');

		const nav = page.getByRole('navigation', { name: 'Síðuflakk' });
		const link = page.locator(`article.cnx-module a[href="#${found!.id}"]`).first();
		for (let i = 0; i < 60 && !(await link.isVisible()); i++) {
			await nav.getByRole('button', { name: 'Næsta síða' }).click();
			await page.waitForTimeout(150);
		}
		await expect(link).toBeVisible();
		await link.click();
		await page.waitForTimeout(2500);

		const shown = await page.evaluate(
			(id) => document.getElementById(id)!.getClientRects().length > 0,
			found!.id
		);
		expect(shown).toBe(true);
		expect(new URL(page.url()).hash).toBe(`#${found!.id}`);
	});

	test('the screen reader hears the position the label shows', async ({ page }) => {
		const urls = sectionsContaining('<p', 1);
		test.skip(urls.length === 0, 'No section content available');

		await page.goto(urls[0]);
		const nav = page.getByRole('navigation', { name: 'Síðuflakk' });
		await expect(nav).toBeVisible({ timeout: 15000 });
		await nav.getByRole('button', { name: 'Næsta síða' }).click();
		const label = (await nav.locator('.paged-nav-label').textContent())!.trim();
		// Filtered: the PWA updater has a status region of its own
		await expect(page.getByRole('status').filter({ hasText: 'Hluti' })).toHaveText(label);
	});

	for (const device of [
		{ name: 'a phone', viewport: { width: 375, height: 667 }, touch: true },
		{ name: 'a desktop', viewport: { width: 1280, height: 720 }, touch: false }
	]) {
		test(`the page buttons take taps on ${device.name}`, async ({ browser }) => {
			const urls = sectionsContaining('<p', 3);
			test.skip(urls.length === 0, 'No section content available');
			test.setTimeout(300000);

			const context = await browser.newContext({
				viewport: device.viewport,
				isMobile: device.touch,
				hasTouch: device.touch
			});
			const page = await context.newPage();
			const nav = page.getByRole('navigation', { name: 'Síðuflakk' });
			const next = nav.getByRole('button', { name: 'Næsta síða' });
			const blocked: string[] = [];

			for (const url of urls) {
				await page.goto(url);
				await expect(nav).toBeVisible({ timeout: 15000 });
				for (let i = 0; i < 40; i++) {
					await page.waitForTimeout(300);
					const r = await nav.evaluate((navEl) => {
						const covered = (b: Element) => {
							const box = b.getBoundingClientRect();
							const y = box.top + box.height / 2;
							return [box.left + 6, box.left + box.width / 2, box.right - 6].some(
								(x) => !b.contains(document.elementFromPoint(x, y))
							);
						};
						const box = navEl.getBoundingClientRect();
						const [prev, nxt] = navEl.querySelectorAll('button');
						return {
							// The tools button's top edge: 16px margin + 48px button
							clear: box.bottom <= window.innerHeight - 64,
							label: navEl.querySelector('.paged-nav-label')?.textContent?.trim(),
							prev: covered(prev),
							next: covered(nxt)
						};
					});
					// An allowed overrun scrolls, so its controls can land anywhere,
					// under the corner buttons too; every other page must keep them clear
					if ((!r.clear || r.prev || r.next) && !(await allowedOverrun(page))) {
						blocked.push(`${url} ${r.label} clear=${r.clear} prev=${r.prev} next=${r.next}`);
					}
					if (await next.isDisabled()) break;
					await next.evaluate((b: HTMLButtonElement) => b.click());
				}
			}
			expect(blocked).toEqual([]);
			await context.close();
		});
	}

	test('→ on arrival never changes section before the pages are ready', async ({ page }) => {
		const urls = sectionsContaining('<img', 1);
		test.skip(urls.length === 0, 'No section with images');

		// Slow images keep the paginator waiting, which is when → used to fall
		// through to the section shortcut and skip a whole section unseen
		await page.route(/\.(png|jpe?g|svg|gif|webp)$/, async (route) => {
			await new Promise((r) => setTimeout(r, 3000));
			await route.continue();
		});
		await page.goto(urls[0]);
		await expect(page.locator('.reading-content').first()).toBeVisible({ timeout: 15000 });
		const path = new URL(page.url()).pathname;
		await page.locator('body').click({ position: { x: 5, y: 5 } });
		await page.keyboard.press('ArrowRight');
		await page.waitForTimeout(1500);
		expect(new URL(page.url()).pathname).toBe(path);
	});

	test('a section shortcut rebound off the arrows still works in paged mode', async ({ page }) => {
		const urls = sectionsContaining('<p', 50).filter((u) => !/\/\d+-0-[^/]*\/$/.test(u));
		test.skip(urls.length === 0, 'No section content available');

		await page.addInitScript(() => {
			const key = 'namsbokasafn:settings';
			const stored = JSON.parse(localStorage.getItem(key) || '{}');
			localStorage.setItem(
				key,
				JSON.stringify({ ...stored, shortcutPreferences: { nextSection: 'w' } })
			);
		});
		await page.goto(urls[0]);
		await expect(page.getByRole('navigation', { name: 'Síðuflakk' })).toBeVisible({
			timeout: 15000
		});
		const nextHref = (await page.locator('a.nav-btn-next').getAttribute('href'))!;
		await page.locator('body').click({ position: { x: 5, y: 5 } });
		await page.keyboard.press('w');
		await expect(page).toHaveURL((u) => u.pathname.replace(/\/$/, '') === nextHref.replace(/\/$/, ''));
	});

	test('Space on a focused Fyrri goes back, not forward', async ({ page }) => {
		const urls = sectionsContaining('<p', 1);
		test.skip(urls.length === 0, 'No section content available');

		await page.goto(urls[0]);
		const nav = page.getByRole('navigation', { name: 'Síðuflakk' });
		await expect(nav).toBeVisible({ timeout: 15000 });
		const label = nav.locator('.paged-nav-label');
		const first = (await label.textContent())!.trim();
		await nav.getByRole('button', { name: 'Næsta síða' }).click();
		await expect(label).not.toHaveText(first);
		await nav.getByRole('button', { name: 'Fyrri síða' }).focus();
		await page.keyboard.press('Space');
		await expect(label).toHaveText(first);
	});

	test('arrival scrolls past the learning objectives to the content', async ({ page }) => {
		// Siggi, 2026-10-04: page 1 gets a full page rather than the room left
		// under the objectives, which on 5.3 at 1280x720 was the title alone
		const urls = sectionsContaining('<p', 3);
		test.skip(urls.length === 0, 'No section content available');

		for (const url of urls) {
			await page.goto(url);
			await expect(page.getByRole('navigation', { name: 'Síðuflakk' })).toBeVisible({
				timeout: 15000
			});
			await page.waitForTimeout(500);
			// Page 1 may still be the title alone, when the first paragraph is
			// too long to share a page with it; that is the split, not the scroll
			const top = await page.evaluate(
				() => document.querySelector('article.cnx-module')!.getBoundingClientRect().top
			);
			expect(top, `${url}: content starts at ${Math.round(top)}px`).toBeLessThan(250);
		}
	});

	for (const kind of ['summary', 'exercises', 'key-terms'] as const) {
		test(`a chapter ${kind} page scrolls instead of paging`, async ({ page }) => {
			// Siggi, 2026-10-04: rollups are reference lists; paged, chapter 1's
			// exercises were one 23,120px page
			const url = rollupSection(kind);
			test.skip(!url, `No synced ${kind} page`);

			await page.goto(url!);
			await expect(page.locator('.reading-content').first()).toBeVisible({ timeout: 15000 });
			await page.evaluate(() => document.fonts.ready);
			await page.waitForTimeout(1500);
			await expect(page.getByRole('navigation', { name: 'Síðuflakk' })).toHaveCount(0);
			await expect(page.locator('.reading-content [hidden]')).toHaveCount(0);

			// And ← / → are section keys again there
			const nextHref = await page.locator('a.nav-btn-next').getAttribute('href');
			test.skip(!nextHref, 'Last page of the book');
			await page.locator('body').click({ position: { x: 5, y: 5 } });
			await page.keyboard.press('ArrowRight');
			await expect(page).toHaveURL(
				(u) => u.pathname.replace(/\/$/, '') === nextHref!.replace(/\/$/, '')
			);
		});
	}

	test('Næsta on the last page finishes the section, even after skipping parts', async ({
		page
	}) => {
		// Siggi, 2026-10-04: as in scrolled mode, reaching the end completes the
		// section. A reader who came in by a link to a later part used to get a
		// "Næsta" that did nothing, and never saw the recall prompt.
		const urls = sectionsContaining('<section', 5);
		test.skip(urls.length === 0, 'No section with sub-sections');
		test.setTimeout(240000);

		await page.goto(urls[0]);
		const nav = page.getByRole('navigation', { name: 'Síðuflakk' });
		await expect(nav).toBeVisible({ timeout: 15000 });
		const label = nav.locator('.paged-nav-label');
		const units = Number((await label.textContent())!.match(/Hluti \d+ af (\d+)/)![1]);
		test.skip(units < 2, 'Section has one part');

		// Arrive by a link to the last part, skipping every part before it
		await page.evaluate((u) => (location.hash = `#sub-${u - 1}`), units);
		await expect(label).toHaveText(new RegExp(`^Hluti ${units} af ${units}`));
		const next = nav.getByRole('button', { name: 'Næsta síða' });

		for (let i = 0; i < 200; i++) {
			const text = (await label.textContent())!.trim();
			const m = text.match(/Hluti (\d+) af (\d+) · Síða (\d+) af (\d+)/)!;
			if (m[1] === m[2] && m[3] === m[4]) break;
			await next.click();
			await expect(label).not.toHaveText(text);
		}
		await next.click();
		await expect(page.getByRole('region', { name: 'Upprifjun' })).toBeVisible();
	});
});

