/**
 * The focus ring, measured on screen (reader-review plan step S2.2, decision D01, register UI-07).
 *
 * `src/app.css` draws every focus ring with one rule: a 2 px `--focus-ring` outline over a solid
 * 2 px `--focus-gap`. tokens.test.ts checks the two colours and focusRing.test.ts the CSS; this
 * spec checks what a keyboard user sees. For each control it moves focus there with the
 * keyboard and checks that:
 *   - the computed outline is solid, in --focus-ring, and the box-shadow is --focus-gap;
 *   - on a screenshot, the pixel in the middle of the ring's top edge is --focus-ring, and it
 *     reaches 3:1 against the gap pixel inside it and the page pixel just outside it (WCAG 1.4.11).
 *
 * Before S2.2 the light ring was amber at 2.54-2.92:1, and an in-text glossary term, the three
 * search fields and the feedback form showed no ring at all (`outline: none`).
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { firstModuleSection, publishedBook, sectionsContaining } from './helpers/content-fixtures';

const BOOK = publishedBook();
const SECTION = BOOK ? firstModuleSection(BOOK) : null;
const THEMES = ['light', 'dark'] as const;
type Theme = (typeof THEMES)[number];
type RGB = [number, number, number];
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

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

async function expectTheme(page: Page, theme: Theme): Promise<void> {
	const html = page.locator('html');
	if (theme === 'dark') await expect(html).toHaveClass(/(^|\s)dark(\s|$)/);
	else await expect(html).not.toHaveClass(/(^|\s)dark(\s|$)/);
}

/**
 * Focus `target` the way a keyboard user does: focus it, step back with Shift+Tab, and Tab onto
 * it again, so :focus-visible matches whatever the browser's heuristics make of a script focus.
 */
async function tabTo(page: Page, target: Locator): Promise<void> {
	await target.evaluate((el) => el.scrollIntoView({ block: 'center' }));
	await target.focus();
	await page.keyboard.press('Shift+Tab');
	await page.keyboard.press('Tab');
	await expect(target).toBeFocused();
}

/** A hex colour as RGB; 3 digits too, since the build's minifier writes #ffffff as #fff. */
function hexToRgb(hex: string): RGB {
	let h = hex.replace(/^#/, '');
	if (!HEX.test(`#${h}`)) throw new Error(`Not a hex colour: "${hex}"`);
	if (h.length === 3) h = [...h].map((c) => c + c).join('');
	return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
}

const css = ([r, g, b]: RGB) => `rgb(${r}, ${g}, ${b})`;

function contrast(a: RGB, b: RGB): number {
	const lum = (c: RGB) => {
		const [r, g, bl] = c.map((v) => {
			const s = v / 255;
			return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
		});
		return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
	};
	const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

/**
 * Check the focused `target`'s ring: computed styles, then three pixels of a viewport screenshot
 * on a vertical line through the middle of its (first line box's) top edge: the middle of the
 * ring, the middle of the gap, and 1.5 px outside the ring.
 */
async function expectRing(page: Page, target: Locator, label: string): Promise<void> {
	// Finish any transition first (the feedback fields transition their box-shadow).
	const shot = await page.screenshot({ animations: 'disabled' });
	const m = await target.evaluate(async (el, png) => {
		const bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0));
		const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
		const ctx = new OffscreenCanvas(bitmap.width, bitmap.height).getContext('2d')!;
		ctx.drawImage(bitmap, 0, 0);
		const scale = bitmap.width / window.innerWidth;
		const cs = getComputedStyle(el);
		const width = parseFloat(cs.outlineWidth) || 0;
		const offset = parseFloat(cs.outlineOffset) || 0;
		const box = el.getClientRects()[0];
		const x = Math.floor((box.left + box.width / 2) * scale);
		const at = (y: number) => [...ctx.getImageData(x, Math.floor(y * scale), 1, 1).data.slice(0, 3)];
		const root = getComputedStyle(document.documentElement);
		return {
			outlineStyle: cs.outlineStyle,
			outlineColor: cs.outlineColor,
			boxShadow: cs.boxShadow,
			ringToken: root.getPropertyValue('--focus-ring').trim(),
			gapToken: root.getPropertyValue('--focus-gap').trim(),
			ring: at(box.top - offset - width / 2),
			gap: at(box.top - offset / 2),
			outside: at(box.top - offset - width - 1.5)
		};
	}, shot.toString('base64'));

	// Soft, so one run reports every check for every control.
	expect.soft(m.outlineStyle, `${label}: outline-style`).toBe('solid');
	const ringToken = hexToRgb(m.ringToken);
	expect.soft(m.outlineColor, `${label}: outline colour`).toBe(css(ringToken));
	if (HEX.test(m.gapToken)) {
		expect.soft(m.boxShadow, `${label}: box-shadow`).toContain(css(hexToRgb(m.gapToken)));
	} else {
		expect.soft(m.gapToken, `${label}: --focus-gap is defined`).toMatch(HEX);
	}

	const [ring, gap, outside] = [m.ring, m.gap, m.outside] as RGB[];
	const off = Math.max(...ring.map((v, i) => Math.abs(v - ringToken[i])));
	expect.soft(off, `${label}: the sampled ring pixel ${css(ring)} is --focus-ring ${css(ringToken)}`).toBeLessThanOrEqual(8);
	const inner = contrast(ring, gap);
	const outer = contrast(ring, outside);
	test.info().annotations.push({ type: label, description: `${inner.toFixed(2)}:1 on the gap, ${outer.toFixed(2)}:1 on the page` });
	expect.soft(inner, `${label}: ring on its gap ${css(gap)} at ${inner.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
	expect.soft(outer, `${label}: ring on the page ${css(outside)} at ${outer.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
}

/**
 * Sections to look in for a glossary term the reader made focusable: the first module section,
 * then the sections with the most `class="term"` markup.
 */
const TERM_SECTIONS = [...new Set([SECTION, ...sectionsContaining('class="term"', 3)].filter(Boolean))] as string[];

test.describe('The focus ring (S2.2, D01)', () => {
	test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });

	for (const theme of THEMES) {
		test.describe(`${theme} theme`, () => {
			test('an in-text glossary term shows the ring', async ({ page }) => {
				test.skip(!SECTION, 'no published book is synced');
				await seedTheme(page, theme);
				// The term is a Tab stop only once glossaryTerms has matched it (role="button").
				let term: Locator | null = null;
				for (const url of TERM_SECTIONS) {
					await page.goto(url);
					const candidate = page.locator('.reading-content dfn[role="button"][tabindex="0"]').first();
					try {
						await candidate.waitFor({ state: 'visible', timeout: 10_000 });
						term = candidate;
						break;
					} catch {
						// No matched term here; try the next section.
					}
				}
				expect(term, `no focusable glossary term in ${TERM_SECTIONS.join(', ')}`).not.toBeNull();
				await expectTheme(page, theme);
				await tabTo(page, term!);
				await expectRing(page, term!, 'glossary term');
			});

			test('the header, the next-section link and a Settings option show the ring', async ({ page }) => {
				test.skip(!SECTION, 'no published book is synced');
				await seedTheme(page, theme);
				await page.goto(SECTION!);
				await page.waitForLoadState('networkidle');
				await expectTheme(page, theme);

				const search = page.getByRole('button', { name: /^Leita/ }).filter({ visible: true }).first();
				await tabTo(page, search);
				await expectRing(page, search, 'header search button');

				const next = page.locator('.nav-btn-next').first();
				await tabTo(page, next);
				await expectRing(page, next, 'next-section link');

				await page.getByRole('button', { name: 'Stillingar', exact: true }).filter({ visible: true }).first().click();
				const option = page.getByRole('dialog').getByRole('group', { name: 'Línubil' }).getByRole('button').first();
				await expect(option).toBeVisible();
				await tabTo(page, option);
				await expectRing(page, option, 'Settings option');
			});

			test('a search field and a form field show the ring', async ({ page }) => {
				test.skip(!BOOK, 'no published book is synced');
				await seedTheme(page, theme);
				await page.goto(`/${BOOK}/ordabok/`);
				await expectTheme(page, theme);
				const search = page.locator('.glossary-search-input');
				await expect(search).toBeVisible();
				await tabTo(page, search);
				await expectRing(page, search, 'glossary search field');

				await page.goto('/feedback/');
				await expectTheme(page, theme);
				const field = page.locator('.form-input').first();
				await expect(field).toBeVisible();
				await tabTo(page, field);
				await expectRing(page, field, 'feedback form field');
			});
		});
	}
});
