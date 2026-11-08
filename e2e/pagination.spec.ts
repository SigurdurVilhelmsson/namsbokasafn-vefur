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
import AxeBuilder from '@axe-core/playwright';
import { MODULE_BODY_SELECTOR, EXAMPLE_BREAK_TRIAL } from '../src/lib/utils/paginate';
import { PAGE_BUDGET, KEY_SCROLL } from '../src/lib/utils/pager';
import {
	sectionsContaining,
	sectionsMatching,
	tocSectionUrls,
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
 * efni's planned .cnx-body: MODULE_BODY_SELECTOR) and nested <section>s, and leaving out
 * the article's own <header>, the running title above every page since S9.2 (D12). A
 * wrapper the paginator wrongly took as one block shows up here as many blocks. An
 * unknown child that holds sub-sections is a body wrapper efni has not told us about, so
 * it throws.
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
			.filter((el) => el.tagName !== 'HEADER')
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

/**
 * Where the page on screen ends, against the bottom of the part of the window it is read
 * in (the pager's own view: the window less PAGE_BUDGET's bottom clearance), in px
 */
async function pageEnd(page: Page) {
	return page.evaluate(
		({ bodySelector, clearance }) => {
			const root = document.querySelector('article.cnx-module') as HTMLElement;
			const flat = (el: Element): Element[] =>
				el.tagName === 'SECTION' ? Array.from(el.children).flatMap(flat) : [el];
			const shown = Array.from(root.children)
				.filter((el) => el.tagName !== 'HEADER')
				.flatMap((el) => (el.matches(bodySelector) ? Array.from(el.children) : [el]))
				.flatMap(flat)
				.filter((el) => (el as HTMLElement).offsetParent !== null);
			return {
				end: Math.max(...shown.map((el) => el.getBoundingClientRect().bottom)),
				viewBottom: window.innerHeight - clearance
			};
		},
		{ bodySelector: MODULE_BODY_SELECTOR, clearance: PAGE_BUDGET.bottomClearance }
	);
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
	// instead of a region of its own, which competed with it: the region says the label's
	// position on arrival, on every page and after 'Fyrri', and a re-split that keeps
	// the page says nothing. Since S9.2 it also names the sub-section shown (UI-05):
	// 'Hluti 2 af 3: Flokkun efnis, síða 4 af 13', commas for the label's '·', the
	// position alone in the intro. S8.3's "what the label shows" is amended on purpose.
	// The locator matches the atomic polite regions: the shared one, and search's while
	// search is open, so this test never opens search.
	test('the screen reader hears the position the label shows, and the sub-section', async ({ page }) => {
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
		/** The label's numbers, and the heading of the sub-section on screen (none in the intro) */
		const says = async () => {
			const [, unit, units, at, pages] = (await label.textContent())!
				.trim()
				.match(/^Hluti (\d+) af (\d+) · Síða (\d+) af (\d+)$/)!;
			const heading = await page.evaluate((bodySelector) => {
				const root = document.querySelector('article.cnx-module')!;
				const shown = Array.from(root.children)
					.flatMap((el) => (el.matches(bodySelector) ? Array.from(el.children) : [el]))
					.find((el) => el.tagName === 'SECTION' && !el.hasAttribute('hidden'));
				const h = shown && Array.from(shown.children).find((el) => /^H[2-6]$/.test(el.tagName));
				return h?.textContent?.replace(/\s+/g, ' ').trim() || null;
			}, MODULE_BODY_SELECTOR);
			const position = `Hluti ${unit} af ${units}`;
			const page_ = `síða ${at} af ${pages}`;
			await expect(region).toHaveText(heading ? `${position}: ${heading}, ${page_}` : `${position}, ${page_}`);
		};

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

	// D11 (2026-11-08), CODE-06: on a page taller than the window, Space scrolls until the
	// page's end is in view, and only then turns. The page is the first one found at run time
	// whose end is below the window, in the section with the most worked examples.
	test('Space scrolls a page taller than the window before it turns the page', async ({ page }) => {
		test.setTimeout(120000);
		const [url] = sectionsContaining('check-knowledge-answer', 1);
		test.skip(!url, 'No section with a worked example');
		const label = pagerLabel(page);
		const next = pager(page).getByRole('button', { name: 'Næsta síða' });

		await openPaged(page, url);
		for (let i = 0; ; i++) {
			expect(i, `${url}: no page taller than the window`).toBeLessThan(PAGE_CAP);
			const { end, viewBottom } = await pageEnd(page);
			if (end > viewBottom + KEY_SCROLL.tolerance) break;
			const text = (await label.textContent())!.trim();
			expect(LAST_PAGE.test(text), `${url}: no page taller than the window`).toBe(false);
			await next.click();
			await expect(label).not.toHaveText(text);
			await page.waitForTimeout(300);
		}
		const tall = (await label.textContent())!.trim();

		await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
		for (let presses = 1; ; presses++) {
			expect(presses, `${tall}: Space never turned the page`).toBeLessThan(20);
			const before = await pageEnd(page);
			await page.keyboard.press('Space');
			await page.waitForTimeout(250);
			if ((await label.textContent())!.trim() !== tall) {
				expect(presses, `${tall}: Space turned the page at once`).toBeGreaterThan(1);
				expect(
					before.end,
					`${tall}: Space turned the page while its end was ${Math.round(before.end - before.viewBottom)}px below the window`
				).toBeLessThanOrEqual(before.viewBottom + KEY_SCROLL.tolerance);
				break;
			}
		}
	});

	test('arrival scrolls past the learning objectives to the content', async ({ page }) => {
		// [USER], 2026-10-04: page 1 gets a full page rather than the room left
		// under the objectives, which on 5.3 at 1280x720 left the title alone on page 1
		const urls = sectionsContaining('<p', 3);
		test.skip(urls.length === 0, 'No section content available');

		for (const url of urls) {
			await page.goto(url);
			await expect(page.getByRole('navigation', { name: 'Síðuflakk' })).toBeVisible({
				timeout: 15000
			});
			await page.waitForTimeout(500);
			// The title is above every page since S9.2 (D12), so no page is the title alone;
			// 'The title and focus survive page turns' tests that. The arrival target is the
			// pager's container, which since S9.4 opens with the machine-translation notice on
			// an unreviewed section's first page, above the article.
			const top = await page.evaluate(
				() => document.querySelector('[data-paged-section]')!.getBoundingClientRect().top
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
		await nav.getByRole('button', { name: 'Ljúka kafla' }).click();
		await expect(page.getByRole('region', { name: 'Upprifjun' })).toBeVisible();
	});

	// Register CODE-17 (S8.4): ← / → and the end marker follow the pager's state, not the mode.

	test('a pager that fails gives the section back: no mark, no hidden block, and → changes section', async ({
		page
	}) => {
		// Fail init after it has added its key listener: its observer of the article throws.
		// Only the pager observes article.cnx-module (answerLinks and glossaryTerms observe
		// the content wrapper), so nothing else is touched.
		await page.addInitScript(() => {
			const observe = MutationObserver.prototype.observe;
			MutationObserver.prototype.observe = function (target, options) {
				if (target instanceof Element && target.matches('article.cnx-module') && options?.childList) {
					throw new Error('forced pager failure (S8.4)');
				}
				return observe.call(this, target, options);
			};
		});
		const failed = page.waitForEvent('console', (m) => m.text().startsWith('Paged mode init failed'));
		await page.goto(SECTION!);
		await failed;
		await expect(page.locator('[data-paged-section]')).toHaveCount(0);
		await expect(page.getByRole('navigation', { name: 'Síðuflakk' })).toHaveCount(0);
		await expect(page.locator(HIDDEN_BLOCKS)).toHaveCount(0);

		const nextHref = (await page.locator('a.nav-btn-next').getAttribute('href'))!;
		await page.locator('body').click({ position: { x: 5, y: 5 } });
		await page.keyboard.press('ArrowRight');
		await expect(page).toHaveURL((u) => samePath(u, nextHref));
	});

	test("a pager that fails lets the section's end mark it read and open its recall", async ({ page }) => {
		await page.addInitScript(() => {
			Object.defineProperty(document.fonts, 'ready', {
				configurable: true,
				get: () => Promise.reject(new Error('forced pager failure (S8.4)'))
			});
		});
		const failed = page.waitForEvent('console', (m) => m.text().startsWith('Paged mode init failed'));
		await page.goto(SECTION!);
		await failed;
		await expect(page.locator('[data-paged-section]')).toHaveCount(0);
		// Hold the end in view until read detection (1.5 s) opens the prompt: late images push
		// the marker back out of view after one scroll (recall-prompt.spec.ts's atEnd)
		const prompt = page.getByRole('region', { name: 'Upprifjun', exact: true });
		await expect(async () => {
			await page.locator('[data-section-end]').evaluate((el) => el.scrollIntoView({ block: 'center' }));
			await expect(prompt).toBeVisible({ timeout: 2500 });
		}).toPass({ timeout: 20000 });
		await expect(page.getByRole('button', { name: 'Merkja kafla sem lesinn' })).toHaveCount(0);
	});

	test('switched to scrolling 300 ms after arrival, while the pager waits for images, nothing stays hidden', async ({
		page
	}) => {
		const urls = sectionsContaining('<img', 1);
		test.skip(urls.length === 0, 'No section with images');
		// Slow images keep the pager in its wait (up to 1.5 s after the fonts)
		await page.route(/\.(png|jpe?g|svg|gif|webp)$/, async (route) => {
			await new Promise((r) => setTimeout(r, 3000));
			await route.continue();
		});
		// Not 'load': it waits for the slow images in view, by which time the pager is up
		await page.goto(urls[0], { waitUntil: 'domcontentloaded' });
		await page.locator('[data-paged-section]').waitFor({ state: 'attached', timeout: 15000 });
		await page.waitForTimeout(300);
		// The switch must land in the wait, or this test proves nothing
		expect(await page.getByRole('navigation', { name: 'Síðuflakk' }).count(), 'the pager was up within 300 ms').toBe(0);
		// The reader's choice arriving from another tab, as the settings store hears it
		await page.evaluate((key) => {
			const state = JSON.parse(localStorage.getItem(key) ?? '{}');
			state.readingMode = 'scrolled';
			const value = JSON.stringify(state);
			localStorage.setItem(key, value);
			window.dispatchEvent(new StorageEvent('storage', { key, newValue: value }));
		}, SETTINGS_KEY);
		await expect(page.locator('[data-paged-section]')).toHaveCount(0);
		await page.waitForTimeout(5000);
		await expect(page.locator(HIDDEN_BLOCKS)).toHaveCount(0);
		await expect(page.getByRole('navigation', { name: 'Síðuflakk' })).toHaveCount(0);
		// Nothing it left behind re-splits: a resize hides nothing either
		await page.setViewportSize({ width: 1100, height: 700 });
		await page.waitForTimeout(500);
		await expect(page.locator(HIDDEN_BLOCKS)).toHaveCount(0);
	});

	test("after the last 'Næsta', → goes on to the next section and ← still turns back a page", async ({ page }) => {
		test.setTimeout(120000);
		await page.goto(SECTION!);
		const nav = page.getByRole('navigation', { name: 'Síðuflakk' });
		await expect(nav).toBeVisible({ timeout: 15000 });
		const label = nav.locator('.paged-nav-label');
		const next = nav.getByRole('button', { name: 'Næsta síða' });
		for (let i = 0; i < PAGE_CAP && !LAST_PAGE.test((await label.textContent())!.trim()); i++) {
			const text = (await label.textContent())!.trim();
			await next.click();
			await expect(label).not.toHaveText(text);
		}
		// The last page's button finishes the section (ruling 3), and says so since S9.3
		await nav.getByRole('button', { name: 'Ljúka kafla' }).click();
		const prompt = page.getByRole('region', { name: 'Upprifjun', exact: true });
		await expect(prompt).toBeVisible();
		await expect(page.locator('[data-paged-section="end"]')).toBeAttached();
		// Skip the prompt: focus goes to the next-section link (S5.3). Escape would skip it
		// only from inside its box.
		await prompt.getByRole('button', { name: 'Sleppa' }).click();
		await expect(prompt).toHaveCount(0);
		const path = new URL(page.url()).pathname;

		await page.keyboard.press('ArrowLeft');
		await expect(label).not.toHaveText(LAST_PAGE);
		expect(new URL(page.url()).pathname).toBe(path);
		await page.keyboard.press('ArrowRight');
		await expect(label).toHaveText(LAST_PAGE);
		expect(new URL(page.url()).pathname).toBe(path);

		const nextHref = (await page.locator('a.nav-btn-next').getAttribute('href'))!;
		await page.keyboard.press('ArrowRight');
		await expect(page).toHaveURL((u) => samePath(u, nextHref));
	});

	test("a pager that fails after its last 'Næsta' does not run the section's end again", async ({ page }) => {
		test.setTimeout(120000);
		await page.goto(SECTION!);
		const nav = page.getByRole('navigation', { name: 'Síðuflakk' });
		await expect(nav).toBeVisible({ timeout: 15000 });
		const label = nav.locator('.paged-nav-label');
		const next = nav.getByRole('button', { name: 'Næsta síða' });
		for (let i = 0; i < PAGE_CAP && !LAST_PAGE.test((await label.textContent())!.trim()); i++) {
			const text = (await label.textContent())!.trim();
			await next.click();
			await expect(label).not.toHaveText(text);
		}
		// The last page's button finishes the section (ruling 3), and says so since S9.3
		await nav.getByRole('button', { name: 'Ljúka kafla' }).click();
		const prompt = page.getByRole('region', { name: 'Upprifjun', exact: true });
		await expect(prompt).toBeVisible();
		await prompt.getByRole('textbox').fill('Efni er allt sem hefur massa og tekur pláss.');
		await prompt.getByRole('button', { name: 'Vista', exact: true }).click();
		// The saved message stays until 'Loka'
		await expect(prompt.getByRole('button', { name: 'Loka' })).toBeVisible();
		// Since S9.3 the prompt takes the page's place and re-splits wait behind it; 'Fyrri'
		// shows the last page again, with the prompt still open, and re-splits run
		await nav.getByRole('button', { name: 'Fyrri síða' }).click();
		await expect(label).toHaveText(LAST_PAGE);

		// The next re-split fails: measuring a block of the section throws
		const failed = page.waitForEvent('console', (m) => m.text().startsWith('Paged mode recompute failed'));
		await page.evaluate(() => {
			const real = window.getComputedStyle;
			window.getComputedStyle = ((el: Element, pseudo?: string | null) => {
				if (el.closest('.reading-content')) throw new Error('forced pager failure (S8.4)');
				return real(el, pseudo);
			}) as typeof window.getComputedStyle;
			window.dispatchEvent(new Event('resize'));
			setTimeout(() => (window.getComputedStyle = real), 1000);
		});
		await failed;
		await expect(page.locator('[data-paged-section]')).toHaveCount(0);

		// The section scrolls again and its end marker reads again. Held in view well past read
		// detection's 1.5 s, it must not open the read-back beside the prompt.
		for (let i = 0; i < 4; i++) {
			await page.locator('[data-section-end]').evaluate((el) => el.scrollIntoView({ block: 'center' }));
			await page.waitForTimeout(1000);
		}
		await expect(page.getByRole('region', { name: 'Upprifjun þín' })).toHaveCount(0);
		await expect(prompt.getByRole('button', { name: 'Loka' })).toBeVisible();
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

	test("the first page does not spend the recall prompt; 'Ljúka kafla' on the last page opens it", async ({ page }) => {
		await openPaged(page, withLink(SECTION!, 'sidur'));
		// The end marker sits just under the page controls, in view on the first page, so it
		// would fire after 1.5 s if it did not stand down while paged
		await expect(page.locator('[data-section-end]')).toBeInViewport({ ratio: 0.5 });
		await page.waitForTimeout(3000);
		await expect(recall(page)).toHaveCount(0);
		// Since S9.3 no bottom completion button sits under a working pager (UI-04)
		await expect(page.getByRole('button', { name: 'Merkja kafla sem lesinn' })).toHaveCount(0);

		const label = pagerLabel(page);
		const next = page.getByRole('button', { name: 'Næsta síða' });
		for (let i = 0; i < 100 && !LAST_PAGE.test((await label.textContent())!.trim()); i++) {
			const text = (await label.textContent())!.trim();
			await next.click();
			await expect(label).not.toHaveText(text);
		}
		await expect(recall(page)).toHaveCount(0);
		// The last page's button finishes the section (ruling 3), and says so since S9.3
		const finish = page.getByRole('button', { name: 'Ljúka kafla' });
		await finish.click();
		await expect(recall(page)).toBeVisible();
		await expect(page.getByRole('button', { name: 'Merkja kafla sem lesinn' })).toHaveCount(0);
		// It opened on the last page: the last unit's last page, where the button is spent
		await expect(label).toHaveText(/^Hluti (\d+) af \1 · Síða (\d+) af \2$/);
		await expect(finish).toBeDisabled();
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

/**
 * A one-finger drag sent through Chromium's debugging protocol, so the browser treats it as
 * real touch input: it scrolls what a finger would scroll, and the page sees touchstart,
 * touchmove and touchend as from a screen.
 */
async function touchDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
	const cdp = await page.context().newCDPSession(page);
	await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
	const steps = 10;
	for (let i = 1; i <= steps; i++) {
		const point = { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps };
		await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] });
	}
	await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
	await cdp.detach();
}

/** The first visible box in the content that scrolls sideways, marked for the test, or null */
const markSidewaysBox = (page: Page) =>
	page.evaluate(() => {
		const box = Array.from(document.querySelectorAll<HTMLElement>('.reading-content *')).find((el) => {
			if (el.offsetParent === null) return false;
			const overflowX = getComputedStyle(el).overflowX;
			const rect = el.getBoundingClientRect();
			return (
				(overflowX === 'auto' || overflowX === 'scroll') &&
				el.scrollWidth > el.clientWidth + 100 &&
				rect.top >= 0 &&
				rect.bottom <= window.innerHeight
			);
		});
		if (!box) return null;
		box.setAttribute('data-test-sideways', '');
		const rect = box.getBoundingClientRect();
		return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
	});

// S9.1, CODE-09: on a phone a sideways drag that scrolls a wide table must not also turn the
// page; elsewhere a swipe still turns it
test.describe('Swipes in paged mode (S9.1)', () => {
	test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
	test.beforeEach(async ({ page }) => seedSettings(page, PAGED));

	test('a drag inside a box that scrolls sideways scrolls the box and keeps the page', async ({ page }) => {
		test.setTimeout(120000);
		const [url] = sectionsContaining('<table', 1);
		test.skip(!url, 'No section with a table');
		const label = pagerLabel(page);
		const next = pager(page).getByRole('button', { name: 'Næsta síða' });

		await openPaged(page, url);
		let middle: { x: number; y: number } | null = null;
		for (let i = 0; !middle; i++) {
			expect(i, `${url}: no page with a box that scrolls sideways in view`).toBeLessThan(PAGE_CAP);
			middle = await markSidewaysBox(page);
			if (middle) break;
			const text = (await label.textContent())!.trim();
			expect(LAST_PAGE.test(text), `${url}: no page with a box that scrolls sideways in view`).toBe(false);
			await next.click();
			await expect(label).not.toHaveText(text);
			await page.waitForTimeout(300);
		}
		const shown = (await label.textContent())!.trim();

		await touchDrag(page, { x: middle!.x + 100, y: middle!.y }, { x: middle!.x - 100, y: middle!.y });
		await page.waitForTimeout(600);
		await expect(label).toHaveText(shown);
		const scrolled = await page.locator('[data-test-sideways]').evaluate((el) => el.scrollLeft);
		expect(scrolled, 'the drag scrolled the box').toBeGreaterThan(0);
	});

	test('a sideways swipe on the text turns the page', async ({ page }) => {
		const [url] = sectionsContaining('<p', 1);
		test.skip(!url, 'No section content available');
		const label = pagerLabel(page);

		await openPaged(page, url);
		const shown = (await label.textContent())!.trim();
		const para = await page.locator('.reading-content p:visible').first().boundingBox();
		const y = para!.y + Math.min(para!.height / 2, 20);
		await touchDrag(page, { x: 300, y }, { x: 100, y });
		await expect(label).not.toHaveText(shown);
	});
});

// D11's trial (2026-11-08), S9.1's restated acceptance: at 390 px Dæmi 3.1 is taller than a
// page, so it breaks before its check-your-learning part. Space scrolls the first part to its
// end, the turn opens the second, and 'Sýna svar' is on that page, reached by Space if the part
// runs past the window.
test.describe("D11's 'Lausn' trial (S9.1)", () => {
	test.use({ viewport: { width: 390, height: 844 } });
	test.beforeEach(async ({ page }) => seedSettings(page, PAGED));

	test("Dæmi 3.1 breaks before its check-your-learning part, and Space reaches 'Sýna svar'", async ({
		page
	}) => {
		test.skip(!EXAMPLE_BREAK_TRIAL, 'The trial is switched off');
		test.setTimeout(120000);
		const [url] = sectionsContaining('>Dæmi 3.1<', 1);
		test.skip(!url, 'No Dæmi 3.1 synced');
		const label = pagerLabel(page);
		const next = pager(page).getByRole('button', { name: 'Næsta síða' });
		const example = page.locator('aside.example', {
			has: page.locator('p.example-label', { hasText: /^Dæmi 3\.1$/ })
		});
		const exampleLabel = example.locator('p.example-label');
		const reveal = example.getByRole('button', { name: 'Sýna svar' });

		await openPaged(page, url);
		for (let i = 0; !(await exampleLabel.isVisible()); i++) {
			expect(i, `${url}: never reached Dæmi 3.1`).toBeLessThan(PAGE_CAP);
			const text = (await label.textContent())!.trim();
			await next.click();
			await expect(label).not.toHaveText(text);
			await page.waitForTimeout(300);
		}
		await expect(reveal, "the first part's page holds no 'Sýna svar'").toBeHidden();
		const firstPart = (await label.textContent())!.trim();

		await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
		for (let presses = 0; (await label.textContent())!.trim() === firstPart; presses++) {
			expect(presses, `${firstPart}: Space never turned the page`).toBeLessThan(20);
			await page.keyboard.press('Space');
			await page.waitForTimeout(250);
		}
		await expect(exampleLabel, "the second part's page starts after the example's label").toBeHidden();
		await expect(reveal).toBeVisible();

		const inView = async () => {
			const box = (await reveal.boundingBox())!;
			return box.y >= 0 && box.y + box.height <= 844;
		};
		const secondPart = (await label.textContent())!.trim();
		for (let presses = 0; !(await inView()); presses++) {
			expect(presses, "Space never brought 'Sýna svar' into view").toBeLessThan(10);
			await page.keyboard.press('Space');
			await page.waitForTimeout(250);
			await expect(label, "Space turned past 'Sýna svar'").toHaveText(secondPart);
		}
	});
});

/** Reader URL of a module section of the published book by its number ('1.2'), or null */
function sectionUrl(number: string): string | null {
	if (!BOOK) return null;
	const [chapter, section] = number.split('.');
	const file = tocSectionUrls(BOOK).find((u) => new RegExp(`/${chapter}-${section}-[^/]+\\.html$`).test(u));
	const m = file?.match(/\/chapters\/([^/]+)\/([^/]+)\.html$/);
	return m ? `/${BOOK}/kafli/${m[1]}/${m[2]}/` : null;
}

/** Runs `check` on every page of the section open in `page`, first to last, turning with 'Næsta' */
async function eachPage(page: Page, url: string, check: (text: string) => Promise<void>) {
	const label = pagerLabel(page);
	const next = pager(page).getByRole('button', { name: 'Næsta síða' });
	for (let i = 0; ; i++) {
		expect(i, `${url}: more than ${PAGE_CAP} pages`).toBeLessThan(PAGE_CAP);
		const text = (await label.textContent())!.trim();
		await check(text);
		if (LAST_PAGE.test(text)) break;
		await next.click();
		await expect(label).not.toHaveText(text);
		await page.waitForTimeout(300);
	}
}

/** The tags of the blocks on screen, as the paginator splits them (the running title left out) */
const shownTags = (page: Page) =>
	page.evaluate((bodySelector) => {
		const root = document.querySelector('article.cnx-module') as HTMLElement;
		const flat = (el: Element): Element[] =>
			el.tagName === 'SECTION' ? Array.from(el.children).flatMap(flat) : [el];
		return Array.from(root.children)
			.filter((el) => el.tagName !== 'HEADER')
			.flatMap((el) => (el.matches(bodySelector) ? Array.from(el.children) : [el]))
			.flatMap(flat)
			.filter((el) => (el as HTMLElement).offsetParent !== null)
			.map((el) => el.tagName);
	}, MODULE_BODY_SELECTOR);

/** Where focus is: on the article, on <body>, or inside a hidden block */
const focusAt = (page: Page) =>
	page.evaluate(() => {
		const active = document.activeElement;
		return {
			tag: active?.tagName ?? 'none',
			body: !active || active === document.body,
			hidden: !!active?.closest('[hidden]')
		};
	});

// Plan step S9.2 (D12, 2026-11-08; UI-19, UI-05, UI-01): the section title stays above every
// page, so its h1 is there on every page for sight and for screen readers, and no page is the
// title alone; a key turn that hides the focus moves it to the article.
test.describe('The title and focus survive page turns (S9.2)', () => {
	test.skip(!SECTION, 'No synced module section');
	test.beforeEach(async ({ page }) => seedSettings(page, PAGED));

	for (const viewport of [
		{ width: 390, height: 844 },
		{ width: 1280, height: 800 }
	]) {
		test(`every page of §1.2 has the one h1, and axe finds it, at ${viewport.width}px`, async ({ page }) => {
			const url = sectionUrl('1.2');
			test.skip(!url, 'No §1.2 synced');
			test.setTimeout(180000);
			await page.setViewportSize(viewport);
			await openPaged(page, url!);
			const title = (await page.locator('article.cnx-module > header h1').textContent())!.trim();
			const h1 = page.getByRole('heading', { level: 1 });

			await eachPage(page, url!, async (text) => {
				await expect(h1, `${text}: one h1`).toHaveCount(1);
				await expect(h1, `${text}: the h1 is the section title`).toHaveText(title);
				await expect(h1).toBeVisible();
				// A best-practice rule, so the ratchet's WCAG tags leave it out: run by name
				const { violations } = await new AxeBuilder({ page }).withRules(['page-has-heading-one']).analyze();
				expect(
					violations.map((v) => v.id),
					`${text}: axe`
				).toEqual([]);
			});
		});

		// A body that opens with a sub-section (14.3, 14.4 and 16.3 on efni's ② preview) gave the
		// title a page of its own, and so did §1.3 at 1280 px, whose first paragraph could not join it
		test(`no page holds the title alone, at ${viewport.width}px`, async ({ page }) => {
			const urls = [
				...new Set([
					// The published book's, so a checkout holding a frozen book tests what CI tests
					...sectionsMatching(/(<main>|class="cnx-body"[^>]*>)\s*<section[\s>]/, 100)
						.filter((u) => u.startsWith(`/${BOOK}/`))
						.slice(0, 3),
					...[sectionUrl('1.3')].filter((u): u is string => !!u)
				])
			];
			test.skip(urls.length === 0, 'No §1.3 and no section whose body opens with a sub-section');
			test.setTimeout(300000);
			await page.setViewportSize(viewport);

			for (const url of urls) {
				await openPaged(page, url);
				await eachPage(page, url, async (text) => {
					const tags = await shownTags(page);
					expect(
						tags.some((tag) => !/^H[1-6]$/.test(tag)),
						`${url} ${text}: the page shows ${tags.join(', ') || 'no block'}`
					).toBe(true);
				});
			}
		});
	}

	// After the rescue keyBelongsElsewhere() walks up from the article, so a box around it that
	// scrolls sideways would take the arrows from then on: every → must still turn, and Space
	// must still act, on a section with a wide table at phone width
	test('a key turn moves focus off a hidden element to the article, and the keys still turn pages', async ({
		page
	}) => {
		const [url] = sectionsContaining('<table', 1);
		test.skip(!url, 'No section with a table');
		test.setTimeout(180000);
		await page.setViewportSize({ width: 390, height: 844 });
		await openPaged(page, url);
		const label = pagerLabel(page);

		// Something on page 1 the turn will hide: a link, a button or a term
		const focused = await page.evaluate(() => {
			const el = Array.from(
				document.querySelectorAll<HTMLElement>('article.cnx-module :is(a[href], button, [tabindex="0"])')
			).find((e) => e.offsetParent !== null);
			el?.focus();
			return el ? `<${el.tagName.toLowerCase()}>` : null;
		});
		if (!focused) await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

		for (let i = 0; ; i++) {
			expect(i, `${url}: more than ${PAGE_CAP} pages`).toBeLessThan(PAGE_CAP);
			const text = (await label.textContent())!.trim();
			if (LAST_PAGE.test(text)) break;
			await page.keyboard.press('ArrowRight');
			await expect(label, `${text}: → did not turn the page`).not.toHaveText(text);
			const at = await focusAt(page);
			expect(
				at.body || at.hidden,
				`${text}: after → from ${i === 0 ? (focused ?? '<body>') : 'the page'}, focus is on <${at.tag.toLowerCase()}>${at.hidden ? ' in a hidden block' : ''}`
			).toBe(false);

			if (i === 0) {
				// Space acts with focus on the article: it scrolls a tall page or turns
				const before = { text: (await label.textContent())!.trim(), y: await page.evaluate(() => scrollY) };
				await page.keyboard.press('Space');
				await expect
					.poll(async () => ({ text: (await label.textContent())!.trim(), y: await page.evaluate(() => scrollY) }), {
						message: `${before.text}: Space did nothing with focus on the article`
					})
					.not.toEqual(before);
			}
		}
	});
});

/** The reader store as saved, or null */
const readerSaved = (page: Page) => page.evaluate(() => localStorage.getItem('namsbokasafn:reader'));

/** Fails the pager's init after its key listener: its observer of the article throws (S8.4) */
async function forcePagerFailure(page: Page) {
	await page.addInitScript(() => {
		const observe = MutationObserver.prototype.observe;
		MutationObserver.prototype.observe = function (target, options) {
			if (target instanceof Element && target.matches('article.cnx-module') && options?.childList) {
				throw new Error('forced pager failure (S8.4)');
			}
			return observe.call(this, target, options);
		};
	});
}

// Plan step S9.3 (UI-05, PED-01, CODE-07, UI-04, UI-20, UI-21, UI-11): a reader can leave paging
// in one tap, scrolled mode's controls stand down while the pager works, and finishing a
// section leads to the next.
test.describe('The way out and the section end (S9.3)', () => {
	test.skip(!SECTION, 'No synced module section');
	// No service worker, so the one-time offline-ready toast never covers the bottom corner
	// these tests measure (it did at 768x1024, where the next-section link ends the document)
	test.use({ serviceWorkers: 'block' });
	test.beforeEach(async ({ page }) => seedSettings(page, PAGED));

	// UI-04: on every page of v1.1 the bottom 'Merkja kafla sem lesinn' sat under the pager and
	// outweighed 'Næsta'. Keyed on the pager working, not on the mode: a failed pager scrolls
	// again, and there the button is the end of the content's completion control.
	test('no completion button sits under a working pager, and a failed pager shows one', async ({ page }) => {
		test.setTimeout(180000);
		await openPaged(page, SECTION!);
		const bottom = page.getByRole('button', { name: 'Merkja kafla sem lesinn' });
		await eachPage(page, SECTION!, async (text) => {
			await expect(bottom, `${text}: the bottom completion button`).toHaveCount(0);
		});
	});

	test('a failed pager keeps the bottom completion button', async ({ page }) => {
		await forcePagerFailure(page);
		const failed = page.waitForEvent('console', (m) => m.text().startsWith('Paged mode init failed'));
		await page.goto(SECTION!);
		await failed;
		await expect(page.getByRole('button', { name: 'Merkja kafla sem lesinn' })).toBeVisible();
	});

	// CODE-07: scrolled mode's continue-reading code ran under the pager. Every page turn
	// scrolls, so the reader store rewrote itself on each one (the race that flaked
	// data-erase.spec.ts), and leaving saved a scroll position whose percentage measured the
	// page shown, not progress, for a later 'Haltu áfram að lesa'.
	test('page turns write nothing to the reader store, and leaving saves no scroll position', async ({ page }) => {
		test.setTimeout(120000);
		await openPaged(page, SECTION!);
		const label = pagerLabel(page);
		const next = pager(page).getByRole('button', { name: 'Næsta síða' });
		const before = await readerSaved(page);
		// A reader scrolls a page, then turns: both scroll the window (a turn to where the
		// content already is would fire no scroll event)
		for (let i = 0; i < 2 && !LAST_PAGE.test((await label.textContent())!.trim()); i++) {
			const text = (await label.textContent())!.trim();
			await page.mouse.wheel(0, 150);
			await page.waitForTimeout(200);
			await next.click();
			await expect(label).not.toHaveText(text);
			await page.waitForTimeout(300);
		}
		expect(await readerSaved(page), 'the reader store after scrolling and turning twice').toBe(before);

		const slug = SECTION!.split('/').filter(Boolean).at(-1)!;
		await page.locator('a.nav-btn-next').click();
		await expect(page).not.toHaveURL((u) => samePath(u, SECTION!));
		const saved = JSON.parse((await readerSaved(page)) ?? '{}');
		expect(
			Object.keys(saved.scrollPositions ?? {}).filter((k) => k.includes(slug)),
			'a scroll position saved for the paged section'
		).toEqual([]);
	});

	/** Walks to the last page with 'Næsta' */
	async function toLastPage(page: Page, url: string) {
		const label = pagerLabel(page);
		const next = pager(page).getByRole('button', { name: 'Næsta síða' });
		for (let i = 0; !LAST_PAGE.test((await label.textContent())!.trim()); i++) {
			expect(i, `${url}: more than ${PAGE_CAP} pages`).toBeLessThan(PAGE_CAP);
			const text = (await label.textContent())!.trim();
			await next.click();
			await expect(label).not.toHaveText(text);
			await page.waitForTimeout(200);
		}
	}

	/** Whether a control lies inside the window, below the sticky header, and is the element there */
	const inView = (page: Page, selector: string) =>
		page.evaluate((sel) => {
			const el = document.querySelector<HTMLElement>(sel);
			if (!el) return `${sel}: not found`;
			const r = el.getBoundingClientRect();
			const header = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
			if (r.top < header || r.bottom > innerHeight) return `${sel}: at ${Math.round(r.top)}-${Math.round(r.bottom)} of ${innerHeight}`;
			const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
			return hit && (hit === el || el.contains(hit)) ? 'ok' : `${sel}: covered by <${hit?.tagName.toLowerCase()}>`;
		}, selector);

	// UI-20, UI-21: the last page's button says it finishes the section; the prompt then takes
	// the page's place, its controls in view on a tablet and a phone, and after it focus is on
	// the next-section link, in view
	for (const viewport of [
		{ width: 768, height: 1024 },
		{ width: 390, height: 844 }
	]) {
		test(`'Ljúka kafla' opens the prompt in the page's place, and leads on, at ${viewport.width}px`, async ({
			page
		}) => {
			test.setTimeout(180000);
			await page.setViewportSize(viewport);
			await openPaged(page, SECTION!);
			await toLastPage(page, SECTION!);
			await pager(page).getByRole('button', { name: 'Ljúka kafla' }).click();
			const prompt = page.getByRole('region', { name: 'Upprifjun', exact: true });
			await expect(prompt).toBeVisible();
			await page.waitForTimeout(400);

			expect(await shownTags(page), 'blocks of the page still shown beside the prompt').toEqual([]);
			for (const [what, control] of [
				['the box', prompt.getByRole('textbox')],
				['Sleppa', prompt.getByRole('button', { name: 'Sleppa', exact: true })],
				['Vista', prompt.getByRole('button', { name: 'Vista', exact: true })]
			] as const) {
				await control.evaluate((el) => el.setAttribute('data-test-at', ''));
				expect(await inView(page, '[data-test-at]'), what).toBe('ok');
				await control.evaluate((el) => el.removeAttribute('data-test-at'));
			}

			await prompt.getByRole('button', { name: 'Sleppa' }).click();
			await expect(prompt).toHaveCount(0);
			const next = page.locator('[data-nav="next"]');
			await expect(next).toBeFocused();
			expect(await inView(page, '[data-nav="next"]'), 'the next-section link').toBe('ok');
			expect((await shownTags(page)).length, 'the last page is shown again').toBeGreaterThan(0);
		});
	}

	// UI-20 (3): on a section whose prompt has already shown and has no saved recall, nothing
	// opens at the end, so the hand-off matters most there
	test("'Ljúka kafla' with nothing to show moves focus straight to the next-section link", async ({ page }) => {
		test.setTimeout(180000);
		await openPaged(page, SECTION!);
		await toLastPage(page, SECTION!);
		await pager(page).getByRole('button', { name: 'Ljúka kafla' }).click();
		const prompt = page.getByRole('region', { name: 'Upprifjun', exact: true });
		await prompt.getByRole('button', { name: 'Sleppa' }).click();
		await expect(prompt).toHaveCount(0);

		await page.reload();
		await expect(pager(page)).toBeVisible({ timeout: 15000 });
		await page.waitForTimeout(300);
		await toLastPage(page, SECTION!);
		await pager(page).getByRole('button', { name: 'Ljúka kafla' }).click();
		await expect(prompt).toHaveCount(0);
		await expect(page.locator('[data-nav="next"]')).toBeFocused();
		expect(await inView(page, '[data-nav="next"]'), 'the next-section link').toBe('ok');
	});

	// UI-21: 'Fyrri' from the prompt shows the last page again rather than turning back
	test("'Fyrri' from the prompt shows the last page again", async ({ page }) => {
		test.setTimeout(180000);
		await openPaged(page, SECTION!);
		await toLastPage(page, SECTION!);
		const last = (await pagerLabel(page).textContent())!.trim();
		await pager(page).getByRole('button', { name: 'Ljúka kafla' }).click();
		await expect(page.getByRole('region', { name: 'Upprifjun', exact: true })).toBeVisible();
		await pager(page).getByRole('button', { name: 'Fyrri síða' }).click();
		await expect(pagerLabel(page)).toHaveText(last);
		expect((await shownTags(page)).length, 'the last page is shown').toBeGreaterThan(0);
	});

	const modeGroup = (page: Page) => page.getByRole('group', { name: 'Lestrarstilling' });

	/** Turns up to `n` pages with 'Næsta', stopping before the last */
	async function turn(page: Page, n: number) {
		const label = pagerLabel(page);
		const next = pager(page).getByRole('button', { name: 'Næsta síða' });
		for (let i = 0; i < n && !LAST_PAGE.test((await label.textContent())!.trim()); i++) {
			const text = (await label.textContent())!.trim();
			await next.click();
			await expect(label).not.toHaveText(text);
			await page.waitForTimeout(300);
		}
	}

	/** Marks the page's first shown block (data-test-anchor) and gives its top */
	const markFirstShown = (page: Page) =>
		page.evaluate((bodySelector) => {
			const root = document.querySelector('article.cnx-module') as HTMLElement;
			const flat = (el: Element): Element[] =>
				el.tagName === 'SECTION' ? Array.from(el.children).flatMap(flat) : [el];
			const first = Array.from(root.children)
				.filter((el) => el.tagName !== 'HEADER')
				.flatMap((el) => (el.matches(bodySelector) ? Array.from(el.children) : [el]))
				.flatMap(flat)
				.find((el) => (el as HTMLElement).offsetParent !== null && el.getBoundingClientRect().height > 0)!;
			first.setAttribute('data-test-anchor', '');
			return first.getBoundingClientRect().top;
		}, MODULE_BODY_SELECTOR);

	/** Presses a button without Playwright scrolling it into view first, as a click on a
	 *  control already reached would */
	const press = (button: ReturnType<Page['getByRole']>) => button.evaluate((el) => (el as HTMLElement).click());

	// UI-05, PED-01: the way out comes before page 1 in the Tab order, ahead of the objectives
	test("Tab reaches 'Samfellt skrun' before any objective button, and the switch leads the reading region", async ({
		page
	}) => {
		test.setTimeout(120000);
		await page.setViewportSize({ width: 1280, height: 800 });
		await openPaged(page, SECTION!);
		const first = await page.evaluate(() => {
			const region = document.querySelector('[data-paged-section]')!.parentElement!.closest('article')!;
			const control = region.querySelector<HTMLElement>(
				'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
			);
			return control?.textContent?.trim() ?? null;
		});
		expect(first, 'the reading region opens with the switch').toBe('Síðuskipt');

		await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
		let reached = '';
		for (let i = 0; i < 300; i++) {
			await page.keyboard.press('Tab');
			reached = await page.evaluate(() => {
				const a = document.activeElement as HTMLElement | null;
				return a?.getAttribute('aria-label') || a?.textContent?.trim() || '';
			});
			if (reached === 'Samfellt skrun' || /^Merkja markmið/.test(reached)) break;
		}
		expect(reached).toBe('Samfellt skrun');
	});

	// CODE-07, PED-01: the place survives the switch, and the choice is stored
	for (const viewport of [
		{ width: 1280, height: 800 },
		{ width: 390, height: 844 }
	]) {
		test(`'Samfellt skrun' keeps the page's first block in place and stores the choice, at ${viewport.width}px`, async ({
			page
		}) => {
			test.setTimeout(120000);
			await page.setViewportSize(viewport);
			await openPaged(page, SECTION!);
			await turn(page, 2);
			const before = await markFirstShown(page);

			await press(modeGroup(page).getByRole('button', { name: 'Samfellt skrun' }));
			await expect(pager(page)).toHaveCount(0);
			await page.waitForTimeout(300);
			await expect(page.locator(HIDDEN_BLOCKS)).toHaveCount(0);
			const after = await page.locator('[data-test-anchor]').evaluate((el) => el.getBoundingClientRect().top);
			expect(Math.abs(after - before), `the block moved from ${Math.round(before)} to ${Math.round(after)}px`).toBeLessThanOrEqual(100);
			expect((await stored(page))?.readingMode).toBe('scrolled');
			await expect(modeGroup(page).getByRole('button', { name: 'Samfellt skrun' })).toHaveAttribute('aria-pressed', 'true');
			await expect(modeGroup(page).getByRole('button', { name: 'Síðuskipt' })).toHaveAttribute('aria-pressed', 'false');
		});
	}

	test("'Síðuskipt' after 'Samfellt skrun' opens the same page again, in view", async ({ page }) => {
		test.setTimeout(120000);
		await page.setViewportSize({ width: 1280, height: 800 });
		await openPaged(page, SECTION!);
		await turn(page, 2);
		const shown = (await pagerLabel(page).textContent())!.trim();
		await press(modeGroup(page).getByRole('button', { name: 'Samfellt skrun' }));
		await expect(pager(page)).toHaveCount(0);
		await page.waitForTimeout(300);

		await press(modeGroup(page).getByRole('button', { name: 'Síðuskipt' }));
		await expect(pagerLabel(page)).toHaveText(shown, { timeout: 15000 });
		expect((await stored(page))?.readingMode).toBe('paged');
		const navTop = await pager(page).evaluate((el) => el.getBoundingClientRect().top);
		expect(navTop, 'the page controls in view').toBeLessThan(800);
	});

	test("the label row's 'Samfellt skrun' leaves paging, and focus goes to the toolbar's", async ({ page }) => {
		test.setTimeout(120000);
		await openPaged(page, SECTION!);
		await turn(page, 1);
		await pager(page).getByRole('button', { name: 'Samfellt skrun' }).click();
		await expect(pager(page)).toHaveCount(0);
		const toolbar = modeGroup(page).getByRole('button', { name: 'Samfellt skrun' });
		await expect(toolbar).toBeFocused();
		await expect(toolbar).toHaveAttribute('aria-pressed', 'true');
		await expect(page.locator(HIDDEN_BLOCKS)).toHaveCount(0);
	});

	// D06: no picker is rendered before S11.3, so a reader who has not paged meets no switch
	test('a reader who has not paged sees no switch', async ({ browser }) => {
		const context = await browser.newContext({ serviceWorkers: 'block' });
		const page = await context.newPage();
		await page.goto(SECTION!);
		await expect(page.locator('.reading-content').first()).toBeVisible({ timeout: 15000 });
		await page.evaluate(() => document.fonts.ready);
		await page.waitForTimeout(1500);
		await expect(page.locator('[data-paged-section]')).toHaveCount(0);
		await expect(page.getByRole('group', { name: 'Lestrarstilling' })).toHaveCount(0);
		await context.close();
	});

	// UI-11 (fixed on main in S2.2): closing Settings on a page past the first keeps the place
	test('closing Settings on a page past the first keeps the place', async ({ page }) => {
		test.setTimeout(120000);
		await page.setViewportSize({ width: 1280, height: 800 });
		await openPaged(page, SECTION!);
		await turn(page, 2);
		const y = await page.evaluate(() => scrollY);
		const navBefore = await pager(page).evaluate((el) => el.getBoundingClientRect().bottom);
		// A coordinate click: an element click scrolls the sticky header's button 'into view'
		// under html's scroll-padding-top first, the very 412 px jump under test (UI-11's note)
		const opener = page.getByRole('button', { name: 'Stillingar' });
		const box = (await opener.boundingBox())!;
		await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
		await expect(page.getByRole('dialog')).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(page.getByRole('dialog')).toHaveCount(0);
		expect(Math.abs((await page.evaluate(() => scrollY)) - y)).toBeLessThanOrEqual(2);
		await expect(opener).toBeFocused();
		const navAfter = await pager(page).evaluate((el) => el.getBoundingClientRect().bottom);
		expect(Math.abs(navAfter - navBefore), 'the page controls stay where they were').toBeLessThanOrEqual(2);
	});

	// The ratchet scans a section unseeded, where no switch shows, so the new controls are
	// scanned here: WCAG 2.1 A/AA on the switch and the label row, in both themes
	for (const theme of ['light', 'dark'] as const) {
		test(`axe finds nothing on the switch and the label row, ${theme}`, async ({ page }) => {
			await openPaged(page, SECTION!);
			if (theme === 'dark') await page.evaluate(() => document.documentElement.classList.add('dark'));
			const { violations } = await new AxeBuilder({ page })
				.include('[role="group"][aria-label="Lestrarstilling"]')
				.include('nav[aria-label="Síðuflakk"]')
				.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
				.analyze();
			expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
		});
	}
});

/** Whether an element named 'Vélþýtt efni' shows in the window below the sticky header */
const mtNoticeInView = (page: Page) =>
	page.evaluate(() => {
		const header = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
		return Array.from(document.querySelectorAll<HTMLElement>('[aria-label="Vélþýtt efni"]')).some((el) => {
			if (el.offsetParent === null) return false;
			const r = el.getBoundingClientRect();
			return r.height > 0 && r.bottom > header && r.top < innerHeight;
		});
	});

// Plan step S9.4 (UI-09, PED-15, PED-03, CODE-15): the machine-translation notice travels with
// the page, a figure link opens the lightbox, and the pager stops downloading every figure.
test.describe('The MT notice, figures and images (S9.4)', () => {
	test.skip(!SECTION, 'No synced module section');
	test.use({ serviceWorkers: 'block' });
	test.beforeEach(async ({ page }) => seedSettings(page, PAGED));

	// UI-09: after the ruled arrival scroll (ruling 1) the notice sat 346-546 px above the window
	// and no later page brought it back. The full banner now stands above the first page, and
	// every page's label row carries the compact marker. A page holding one block taller than
	// the window pushes the label row below it until S9.5 docks it, so such pages are skipped.
	for (const viewport of [
		{ width: 390, height: 844 },
		{ width: 768, height: 1024 },
		{ width: 1280, height: 800 }
	]) {
		test(`'Vélþýtt' is in view on arrival and after each turn of §1.2, at ${viewport.width}px`, async ({ page }) => {
			const url = sectionUrl('1.2');
			test.skip(!url, 'No §1.2 synced');
			test.setTimeout(180000);
			await page.setViewportSize(viewport);
			await openPaged(page, url!);
			await page.waitForTimeout(300);

			expect(await mtNoticeInView(page), 'the notice on arrival').toBe(true);
			const objectivesBottom = await page.evaluate(() => {
				const box = Array.from(document.querySelectorAll('h3')).find((h) => h.textContent?.includes('Námsmarkmið'));
				return box?.closest('div.mb-8')?.getBoundingClientRect().bottom ?? null;
			});
			// Ruling 1: the arrival scroll lands on the pager's container, past the objectives. The
			// notice now opens that container, so the objectives must still end above it. (Their
			// last few px can show: the container lands 96 px down, under their bottom margin, and
			// at 768x1024 the scroll stops short, UI-19's arrival shortfall, which no step names.)
			const containerTop = await page.evaluate(
				() => document.querySelector('[data-paged-section]')!.getBoundingClientRect().top
			);
			if (objectivesBottom !== null) {
				expect(objectivesBottom, 'the objectives above the arrival target (ruling 1)').toBeLessThanOrEqual(containerTop);
			}

			await eachPage(page, url!, async (text) => {
				// An allowed overrun (one block taller than the page, or headings with it) whose
				// label row really is below the window
				const { headed } = await shownPage(page);
				const navTop = await pager(page).evaluate((el) => el.getBoundingClientRect().top);
				if (headed && navTop >= viewport.height) return;
				expect(await mtNoticeInView(page), `${text}: the notice`).toBe(true);
			});
		});
	}

	test("the label row's 'Tilkynna villu' reports this section", async ({ page }) => {
		await openPaged(page, SECTION!);
		const [, book, , chapter, section] = SECTION!.split('/');
		const href = (await pager(page).getByRole('link', { name: 'Tilkynna villu' }).getAttribute('href'))!;
		const url = new URL(href, 'http://x');
		expect(url.pathname.replace(/\/$/, '')).toBe('/feedback');
		expect([url.searchParams.get('bok'), url.searchParams.get('kafli'), url.searchParams.get('hluti')]).toEqual([
			book,
			chapter,
			section
		]);
	});

	test('the notice and the marker stay out of print', async ({ page }) => {
		await openPaged(page, SECTION!);
		await page.emulateMedia({ media: 'print' });
		await page.waitForTimeout(300);
		const shown = await page.evaluate(
			() =>
				Array.from(document.querySelectorAll<HTMLElement>('[aria-label="Vélþýtt efni"]')).filter(
					(el) => el.getClientRects().length > 0
				).length
		);
		expect(shown).toBe(0);
	});
});
