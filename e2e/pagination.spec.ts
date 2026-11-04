/**
 * Paged reading mode (reader plan P0.4): a section renders as viewport-fitting
 * pages with Fyrri/Næsta navigation instead of one long scroll.
 *
 * v1.1's 19 tests (dde768e), run on main since plan step S8.3 (register CODE-19).
 * On main paging is not the default: a section pages only for a reader who chose
 * paged or under a ?lestur=sidur link (D06; the default is open call 3). So every
 * test here seeds a chosen 'paged' through seedSettings, and passes whatever the
 * interim default is.
 */

import { test, expect, type Page } from '@playwright/test';
import { MODULE_BODY_SELECTOR } from '../src/lib/utils/paginate';
import { PAGE_BUDGET } from '../src/lib/utils/pager';
import {
	sectionsContaining,
	rollupSection,
	publishedBook,
	firstModuleSection
} from './helpers/content-fixtures';
import { seedSettings, SETTINGS_KEY } from './helpers/seedSettings';

/** A reader who picked paged (stored once per tab, so a test's own write survives reloads) */
const PAGED = { readingMode: 'paged' } as const;

const BOOK = publishedBook();
/** The published book's first module section ('1-1-…'): the fixed fixture of tests 2-4 */
const SECTION = BOOK ? firstModuleSection(BOOK) : null;
/** The label on a section's last page: the last unit's last page */
const LAST_PAGE = /^Hluti (\d+) af \1 · Síða (\d+) af \2$/;
/** Ends a walk through a section's pages that never reaches the last one */
const PAGE_CAP = 150;
const samePath = (url: string | URL, path: string) =>
	new URL(url, 'http://x').pathname.replace(/\/$/, '') === path.replace(/\/$/, '');

/**
 * The blocks of the page on screen, split as the paginator splits them: the article's
 * children in document order, looking through the module-body wrapper (<main>, or
 * efni's planned .cnx-body: MODULE_BODY_SELECTOR) and nested <section>s. A wrapper the
 * paginator wrongly took as one block shows up here as many blocks. An unknown child
 * that holds sub-sections is a body wrapper efni has not told us about, so it throws.
 */
async function shownPage(page: Page) {
	return page.evaluate((bodySelector) => {
		const root = document.querySelector('article.cnx-module') as HTMLElement;
		const stray = Array.from(root.children).find(
			(el) => el.tagName !== 'SECTION' && !el.matches(bodySelector) && el.querySelector('section')
		);
		if (stray) {
			throw new Error(
				`article.cnx-module > <${stray.tagName.toLowerCase()} class="${stray.className}"> holds ` +
					'sub-sections: a module-body wrapper paginate.ts does not know (MODULE_BODY_SELECTOR)'
			);
		}
		const flat = (el: Element): Element[] =>
			el.tagName === 'SECTION' ? Array.from(el.children).flatMap(flat) : [el];
		const shown = Array.from(root.children)
			.flatMap((el) => (el.matches(bodySelector) ? Array.from(el.children) : [el]))
			.flatMap(flat)
			.filter((el) => (el as HTMLElement).offsetParent !== null);
		return {
			visible: shown.reduce((sum, el) => sum + el.getBoundingClientRect().height, 0),
			count: shown.length,
			// Headings followed by one block: kept together even when they
			// overrun, rather than strand the heading on a page of its own
			headed: shown.slice(0, -1).every((el) => /^H[2-4]$/.test(el.tagName)),
			viewport: window.innerHeight
		};
	}, MODULE_BODY_SELECTOR);
}

/** Blocks the pager hid. practiceReveal's self-assessment row is hidden in scrolled mode too. */
const HIDDEN_BLOCKS = '.reading-content [hidden]:not(.practice-self-assess)';

/** The page count a label gives: units, and pages in the shown unit */
function labelCounts(text: string): { units: number; pages: number } {
	const m = text.match(/Hluti \d+ af (\d+) · Síða \d+ af (\d+)/)!;
	return { units: Number(m[1]), pages: Number(m[2]) };
}

test.describe('Paged reading mode', () => {
	test.skip(!SECTION, 'No synced module section');
	test.beforeEach(async ({ page }) => seedSettings(page, PAGED));

	// The one click-through (register CODE-19): each step waits for what it needs, so a
	// slow page fails or passes and never skips. It asserts the pager on module sections
	// only: introductions and the Formáli page today too, which M9 may change.
	test('shows pagination controls on a section page', async ({ page }) => {
		const nav = page.getByRole('navigation', { name: 'Síðuflakk' });
		const label = nav.locator('.paged-nav-label');
		const nextSection = page.locator('a.nav-btn-next');
		const chapter = SECTION!.split('/')[3];

		await page.goto('/');
		await page.locator(`a[href="/${BOOK}"], a[href="/${BOOK}/"]`).first().click();
		await expect(page).toHaveURL((u) => samePath(u, `/${BOOK}`));
		const chapterCard = page.locator(`main a[href^="/${BOOK}/kafli/${chapter}/"]`).first();
		await expect(chapterCard).toBeVisible({ timeout: 15000 });
		await chapterCard.click();
		await expect(page).toHaveURL(/\/kafli\/[^/]+\/[^/]+\/?$/);

		// In the app from the chapter's first page to its first module section
		for (let i = 0; i < 3 && !samePath(page.url(), SECTION!); i++) {
			const href = (await nextSection.getAttribute('href'))!;
			await nextSection.click();
			await expect(page).toHaveURL((u) => samePath(u, href));
		}
		expect(samePath(page.url(), SECTION!), `reached ${page.url()}`).toBe(true);
		await expect(nav).toBeVisible({ timeout: 15000 });
		await expect(label).toHaveText(/^Hluti 1 af \d+ · Síða 1 af \d+$/);
		await nav.getByRole('button', { name: 'Næsta síða' }).click();
		await expect(page).toHaveURL(/#sub-\d+(-p-\d+)?$/);

		// On to the next section in the app: SvelteKit reuses the page, and its pager
		// starts again on the first page, with no page hash
		const href = (await nextSection.getAttribute('href'))!;
		await nextSection.click();
		await expect(page).toHaveURL((u) => samePath(u, href) && !u.hash);
		await expect(nav).toBeVisible({ timeout: 15000 });
		await expect(label).toHaveText(/^Hluti 1 af \d+ · Síða 1 af \d+$/);
	});

	test('Næsta advances and updates the position label and hash', async ({ page }) => {
		await page.goto(SECTION!);
		const nav = page.getByRole('navigation', { name: 'Síðuflakk' });
		await expect(nav).toBeVisible({ timeout: 15000 });

		const label = nav.locator('.paged-nav-label');
		const before = await label.textContent();
		const { units, pages } = labelCounts(before!);
		expect(units > 1 || pages > 1, `${SECTION} is one page: pick a longer fixture`).toBe(true);

		const nextButton = nav.getByRole('button', { name: 'Næsta síða' });
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
	// keeps a page of its own and scrolls there. shownPage() splits the body
	// wrapper and nested <section>s itself before counting, so a wrapper the
	// paginator wrongly took as one block shows up as many blocks and still fails.
	//
	// Since S8.3 it also holds the controls to the page budget (register CODE-19): on
	// every page but an allowed overrun, the controls end within the window less the
	// scroll offset and the bottom clearance (PAGE_BUDGET), with 24 px for the
	// controls' own margins. Summing block heights alone let a page 200 px too tall
	// pass. Measured on chemistry at 1280x720: worst 502 px against 572.
	test('every page of a section fits the viewport', async ({ page }) => {
		test.setTimeout(180000);
		const fixtures = [...new Set([...sectionsContaining('<p', 1), SECTION!])];
		const nav = page.getByRole('navigation', { name: 'Síðuflakk' });
		const label = nav.locator('.paged-nav-label');
		const next = nav.getByRole('button', { name: 'Næsta síða' });

		for (const url of fixtures) {
			await page.goto(url);
			await expect(nav).toBeVisible({ timeout: 15000 });
			await page.waitForTimeout(500);
			for (let i = 0; ; i++) {
				expect(i, `${url}: more than ${PAGE_CAP} pages`).toBeLessThan(PAGE_CAP);
				const text = (await label.textContent())!.trim();
				const { visible, count, headed, viewport } = await shownPage(page);
				expect(count, `${url} ${text}: a page with no block`).toBeGreaterThan(0);
				const ok = visible <= viewport || count === 1 || headed;
				expect(
					ok,
					`${url} ${text}: ${Math.round(visible)}px of content in ${count} block(s) in a ${viewport}px window`
				).toBe(true);
				if (!headed) {
					const used = await page.evaluate(
						() =>
							document.querySelector('nav.paged-nav')!.getBoundingClientRect().bottom -
							document.querySelector('[data-paged-section]')!.getBoundingClientRect().top
					);
					const limit = viewport - PAGE_BUDGET.scrollOffset - PAGE_BUDGET.bottomClearance + 24;
					expect(
						used,
						`${url} ${text}: the controls end ${Math.round(used)}px below the content top; the budget allows ${limit}`
					).toBeLessThanOrEqual(limit);
				}
				if (LAST_PAGE.test(text)) break;
				await next.click();
				await expect(label).not.toHaveText(text);
				await page.waitForTimeout(300);
			}
		}
	});

	test('continuous-scroll setting restores the scrolled experience', async ({ page }) => {
		await page.goto(SECTION!);

		const nav = page.getByRole('navigation', { name: 'Síðuflakk' });
		await expect(nav).toBeVisible({ timeout: 15000 });

		// Switch to "Samfellt skrun" via localStorage (the settings store
		// persists there) and reload — the controls must disappear and no
		// content block may remain hidden. On main no setting is rendered yet
		// (D06), so this writes the stored choice a picker will write; the seed
		// does not run again on the reload.
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
		await expect(page.locator(HIDDEN_BLOCKS)).toHaveCount(0);
	});

	// The tests below each failed before the fix they guard (QA 2026-10-03,
	// batch E items E1, E2, E6, E8, E18 and E19).

	/** True when the shown page is an overrun the paginator allows: one block
	 *  taller than a page, or headings kept with the one block after them. */
	async function allowedOverrun(page: Page): Promise<boolean> {
		return (await shownPage(page)).headed;
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

		// To the last page, by its label: v1.1 stopped after 40 pages, so on a section of
		// 40 pages or fewer the last click finished the section and the label could not
		// change (the fixture has 54 today)
		for (let i = 0; ; i++) {
			expect(i, `more than ${PAGE_CAP} pages`).toBeLessThan(PAGE_CAP);
			const before = (await label.textContent())!.trim();
			await page.waitForTimeout(1200);
			const after = (await label.textContent())!.trim();
			if (after !== before) changes.push(`${before} -> ${after}`);
			if (LAST_PAGE.test(after)) break;
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

	// Since S8.3 the pager speaks through the app's one polite region (register UI-01)
	// instead of a region of its own, which competed with it: the region says what the
	// label shows on arrival, on every page and after 'Fyrri', and a re-split that keeps
	// the page says nothing. The locator matches the atomic polite regions: the shared
	// one, and search's while search is open, so this test never opens search.
	test('the screen reader hears the position the label shows', async ({ page }) => {
		const urls = sectionsContaining('<p', 1);
		test.skip(urls.length === 0, 'No section content available');
		test.setTimeout(120000);

		await page.goto(urls[0]);
		const nav = page.getByRole('navigation', { name: 'Síðuflakk' });
		const label = nav.locator('.paged-nav-label');
		const next = nav.getByRole('button', { name: 'Næsta síða' });
		const region = page.locator('[aria-live="polite"][aria-atomic="true"]');
		await expect(nav).toBeVisible({ timeout: 15000 });
		await expect(region).toHaveCount(1);
		const says = async () => expect(region).toHaveText((await label.textContent())!.trim());

		await says();
		for (let i = 0; ; i++) {
			expect(i, `more than ${PAGE_CAP} pages`).toBeLessThan(PAGE_CAP);
			const text = (await label.textContent())!.trim();
			if (LAST_PAGE.test(text)) break;
			await next.click();
			await expect(label).not.toHaveText(text);
			await says();
		}
		await nav.getByRole('button', { name: 'Fyrri síða' }).click();
		await says();

		// A re-split that keeps the page (here a resize to the same size) is silent
		await page.evaluate(() => {
			const w = window as unknown as { __spoken: string[] };
			w.__spoken = [];
			const el = document.querySelector('[aria-live="polite"][aria-atomic="true"]')!;
			new MutationObserver(() => w.__spoken.push(el.textContent ?? '')).observe(el, {
				childList: true,
				characterData: true,
				subtree: true
			});
			window.dispatchEvent(new Event('resize'));
		});
		await page.waitForTimeout(1500);
		expect(await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken)).toEqual([]);
		await says();
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
			// Its own context, which the describe's page seed does not reach
			await seedSettings(context, PAGED);
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

		// Added to the describe's 'paged' seed, which runs first
		await seedSettings(page, { shortcutPreferences: { nextSection: 'w' } });
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
		// [USER], 2026-10-04: page 1 gets a full page rather than the room left
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

	// The kind names the test as v1.1 did; the type is the table of contents' one,
	// which readerPolicy.shouldPage reads (ruling 2)
	for (const { kind, type } of [
		{ kind: 'summary', type: 'summary' },
		{ kind: 'exercises', type: 'exercises' },
		{ kind: 'key-terms', type: 'glossary' },
		{ kind: 'key-equations', type: 'equations' }
	] as const) {
		test(`a chapter ${kind} page scrolls instead of paging`, async ({ page }) => {
			// [USER], 2026-10-04: rollups are reference lists; paged, chapter 1's
			// exercises were one 23,120px page
			const url = rollupSection(type);
			test.skip(!url, `No synced ${kind} page`);

			await page.goto(url!);
			await expect(page.locator('.reading-content').first()).toBeVisible({ timeout: 15000 });
			await page.evaluate(() => document.fonts.ready);
			await page.waitForTimeout(1500);
			await expect(page.getByRole('navigation', { name: 'Síðuflakk' })).toHaveCount(0);
			await expect(page.locator(HIDDEN_BLOCKS)).toHaveCount(0);

			// And ← / → are section keys again there. Count first: getAttribute waits
			// for the link and threw, so the skip could never run
			const nextLink = page.locator('a.nav-btn-next');
			test.skip((await nextLink.count()) === 0, 'Last page of the book');
			const nextHref = await nextLink.getAttribute('href');
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
		// [USER], 2026-10-04: as in scrolled mode, reaching the end completes the
		// section. A reader who came in by a link to a later part used to get a
		// "Næsta" that did nothing, and never saw the recall prompt.
		const urls = sectionsContaining('<section', 5);
		test.skip(urls.length === 0, 'No section with sub-sections');
		test.setTimeout(240000);

		await page.goto(urls[0]);
		const nav = page.getByRole('navigation', { name: 'Síðuflakk' });
		await expect(nav).toBeVisible({ timeout: 15000 });
		const label = nav.locator('.paged-nav-label');
		const { units } = labelCounts((await label.textContent())!);
		expect(units, `${urls[0]} has one part: pick a fixture with sub-sections`).toBeGreaterThanOrEqual(2);

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

	// Register CODE-16 (S8.1's pager.ts): a page number past its unit's end, written on
	// a smaller screen, opens that unit's last page and rewrites the hash to it. v1.1
	// opened the section's first page.
	test("a page past its sub-section's end opens that sub-section's last page", async ({ page }) => {
		const urls = sectionsContaining('<section', 5);
		test.skip(urls.length === 0, 'No section with sub-sections');

		await page.goto(`${urls[0]}#sub-1-p-99`);
		const label = page.getByRole('navigation', { name: 'Síðuflakk' }).locator('.paged-nav-label');
		await expect(label).toHaveText(/^Hluti 2 af \d+ · Síða (\d+) af \1$/, { timeout: 15000 });
		// The last page must differ from the first, and the hash must name it exactly
		const pages = labelCounts((await label.textContent())!).pages;
		expect(pages, `${urls[0]}: unit 2 has one page; pick another fixture`).toBeGreaterThan(1);
		await expect(page).toHaveURL(new RegExp(`#sub-1-p-${pages - 1}$`));
	});
});

// ---------------------------------------------------------------------------
// The pager through a ?lestur= link, with no seed (plan step S8.2; folded in from
// e2e/reading-mode-link.spec.ts in S8.3; register PED-01, PED-35, CODE-22; D06;
// rulings 2 and 3). A section pages only under a visit-only '?lestur=sidur' link or a
// mode the reader picked; with neither it renders as on main, and the link never
// changes storage. No rollup pages. 'Næsta' on the last page is the section's end and
// opens 'Upprifjun'.
//
// Every "no pager" assertion is followed, in the same test, by a load that shows the
// pager, so an absent pager cannot pass because the pager was slow or broken. The
// fresh-profile test is the one test here that fails if the unchosen mode turns paged:
// it guards D06 and M8's exit criterion, so never make it compare with
// UNCHOSEN_READING_MODE, which would pass under either default.
// ---------------------------------------------------------------------------

const SUMMARY = rollupSection('summary');
/** What a fresh profile stores on its first load since S6.1: the marker, no choice */
const FRESH_PROFILE = '{"_version":1,"_born":1}';

const pager = (page: Page) => page.getByRole('navigation', { name: 'Síðuflakk' });
const pagerLabel = (page: Page) => page.locator('.paged-nav-label');
const recall = (page: Page) => page.getByRole('region', { name: 'Upprifjun', exact: true });
const hiddenBlocks = (page: Page) => page.locator(HIDDEN_BLOCKS);

const storedRaw = (page: Page) => page.evaluate((key) => localStorage.getItem(key), SETTINGS_KEY);
const stored = async (page: Page) => JSON.parse((await storedRaw(page)) ?? 'null');

async function open(page: Page, url: string) {
	await page.goto(url);
	await expect(page.locator('.reading-content').first()).toBeVisible({ timeout: 15000 });
}

/** Open a page that should page, and wait until its controls show and take keys */
async function openPaged(page: Page, url: string) {
	await open(page, url);
	await expect(pager(page)).toBeVisible({ timeout: 15000 });
	await expect(pagerLabel(page)).toHaveText(/^Hluti 1 af \d+ · Síða 1 af \d+$/);
	await expect(hiddenBlocks(page).first()).toBeAttached();
	// The pager adds its key listener just after its controls render
	await page.waitForTimeout(300);
}

/**
 * Open a page that should not page. The pager would be up by now: it waits at most 1.5 s for
 * images after the fonts, and openPaged's loads show it within that.
 */
async function openScrolled(page: Page, url: string) {
	await open(page, url);
	await page.waitForTimeout(4000);
	await expect(pager(page)).toHaveCount(0);
	await expect(page.locator('[data-paged-section]')).toHaveCount(0);
	await expect(hiddenBlocks(page)).toHaveCount(0);
}

/** Press → on the page itself, not in a control */
async function pressRight(page: Page) {
	await page.locator('body').click({ position: { x: 5, y: 5 } });
	await page.keyboard.press('ArrowRight');
}

const withLink = (url: string, value: 'sidur' | 'skrun') => `${url}?lestur=${value}`;

test.describe('The pager through a ?lestur= link, with no seed (S8.2)', () => {
	test.skip(!SECTION, 'No synced numbered section');

	test('a fresh profile without a link does not page and stores no mode; the link pages it', async ({
		page
	}) => {
		await openScrolled(page, SECTION!);
		expect(await storedRaw(page)).toBe(FRESH_PROFILE);

		await openPaged(page, withLink(SECTION!, 'sidur'));
		expect(await storedRaw(page)).toBe(FRESH_PROFILE);
	});

	test('under ?lestur=sidur, → turns the page, not the section, and ← turns it back', async ({ page }) => {
		await openPaged(page, withLink(SECTION!, 'sidur'));
		const path = new URL(page.url()).pathname;
		const first = await pagerLabel(page).textContent();

		await pressRight(page);
		await expect(pagerLabel(page)).not.toHaveText(first!);
		expect(new URL(page.url()).pathname).toBe(path);

		await page.keyboard.press('ArrowLeft');
		await expect(pagerLabel(page)).toHaveText(first!);
		expect(new URL(page.url()).pathname).toBe(path);
	});

	test("the first page does not spend the recall prompt; the last 'Næsta' opens it", async ({ page }) => {
		await openPaged(page, withLink(SECTION!, 'sidur'));
		// The end marker sits just under the page controls, in view on the first page, so it
		// would fire after 1.5 s if it did not stand down while paged
		await expect(page.locator('[data-section-end]')).toBeInViewport({ ratio: 0.5 });
		await page.waitForTimeout(3000);
		await expect(recall(page)).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Merkja kafla sem lesinn' })).toBeVisible();

		const next = page.getByRole('button', { name: 'Næsta síða' });
		for (let i = 0; i < 100 && (await recall(page).count()) === 0; i++) {
			await next.click();
		}
		await expect(recall(page)).toBeVisible();
		await expect(page.getByRole('button', { name: 'Merkja kafla sem lesinn' })).toHaveCount(0);
		// It opened on the last page: the last unit's last page, where 'Næsta' is spent
		await expect(pagerLabel(page)).toHaveText(/^Hluti (\d+) af \1 · Síða (\d+) af \2$/);
		await expect(next).toBeDisabled();
	});

	test("?lestur=skrun overrides a stored 'paged' without changing storage", async ({ page }) => {
		const seeded = { _version: 1, _born: 1, readingMode: 'paged' };
		await seedSettings(page, { readingMode: 'paged' });

		await openScrolled(page, withLink(SECTION!, 'skrun'));
		expect(await stored(page)).toEqual(seeded);

		// → is the section shortcut again
		const nextHref = await page.locator('a.nav-btn-next').getAttribute('href');
		await pressRight(page);
		await expect(page).toHaveURL((u) => u.pathname.replace(/\/$/, '') === nextHref!.replace(/\/$/, ''));
		expect(await stored(page)).toEqual(seeded);

		// Without the link, the stored choice pages the section
		await openPaged(page, SECTION!);
		expect(await stored(page)).toEqual(seeded);
	});

	test("?lestur=sidur overrides a stored 'scrolled' without changing storage", async ({ page }) => {
		const seeded = { _version: 1, _born: 1, readingMode: 'scrolled' };
		await seedSettings(page, { readingMode: 'scrolled' });

		await openPaged(page, withLink(SECTION!, 'sidur'));
		expect(await stored(page)).toEqual(seeded);

		await openScrolled(page, SECTION!);
		expect(await stored(page)).toEqual(seeded);
	});

	test('a rollup never pages, even under ?lestur=sidur, and → still changes section there', async ({
		page
	}) => {
		test.skip(!SUMMARY, 'No summary page in this content');
		await openPaged(page, withLink(SECTION!, 'sidur'));

		await openScrolled(page, withLink(SUMMARY!, 'sidur'));
		const nextLink = page.locator('a.nav-btn-next');
		test.skip((await nextLink.count()) === 0, 'The summary is the last section');
		const nextHref = await nextLink.getAttribute('href');
		await pressRight(page);
		await expect(page).toHaveURL((u) => u.pathname.replace(/\/$/, '') === nextHref!.replace(/\/$/, ''));
		expect(await storedRaw(page)).toBe(FRESH_PROFILE);
	});

	test('a rollup reached from a paged section under ?lestur=sidur does not page', async ({ page }) => {
		const glossary = rollupSection('glossary');
		test.skip(!glossary, 'No key-terms page in this content');
		await openScrolled(page, withLink(glossary!, 'sidur'));
		const prevLink = page.locator('a.nav-btn-prev');
		test.skip((await prevLink.count()) === 0, 'The key-terms page is the first section');
		const glossaryPath = new URL(page.url()).pathname;

		// Back to the section before it, in the app: SvelteKit reuses the page, so the link's
		// mode carries on ([USER], 2026-11-03; S8.4 may change this) and that section pages
		const prevHref = await prevLink.getAttribute('href');
		await prevLink.click();
		await expect(page).toHaveURL((u) => u.pathname.replace(/\/$/, '') === prevHref!.replace(/\/$/, ''));
		await expect(pager(page)).toBeVisible({ timeout: 15000 });

		// Forward to the rollup, in the app: the mode is recomputed for its type (ruling 2)
		await page.locator('a.nav-btn-next').click();
		await expect(page).toHaveURL((u) => u.pathname.replace(/\/$/, '') === glossaryPath.replace(/\/$/, ''));
		await expect(page.locator('[data-paged-section]')).toHaveCount(0);
		await page.waitForTimeout(2000);
		await expect(pager(page)).toHaveCount(0);
		await expect(hiddenBlocks(page)).toHaveCount(0);
		// The pager spoke on the section before; gone, it took its words back from the
		// app's one live region (S8.3, UI-01), which outlives it
		await expect(page.locator('[aria-live="polite"][aria-atomic="true"]')).not.toHaveText(/^Hluti/);
		expect(await storedRaw(page)).toBe(FRESH_PROFILE);
	});
});
