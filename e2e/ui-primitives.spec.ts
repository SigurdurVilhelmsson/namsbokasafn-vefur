/**
 * Button and Switch (plan step SF.2, register UI-17), measured where readers meet them:
 * - every Settings switch, on and off, in both themes: the knob against its track and the
 *   track against the dialog reach 3:1 (WCAG 1.4.11, which axe does not measure);
 * - on a paged section, 'Næsta' is the largest filled control on the page, so the action a
 *   reader presses some 30 times per section reads as the main one.
 * Colours go through a canvas, so oklch and the like come back as sRGB, and backgrounds
 * are composited the way the browser paints them.
 */
import { test, expect, type Page } from '@playwright/test';
import { firstModuleSection, publishedBook } from './helpers/content-fixtures';
import { seedSettings } from './helpers/seedSettings';

const BOOK = publishedBook();
const SECTION = BOOK ? firstModuleSection(BOOK) : null;

/** Installs window.__colour: rgba(), behind(), contrast() for the page's elements. */
async function installColour(page: Page): Promise<void> {
	await page.addInitScript(() => {
		const ctx = () => {
			const w = window as unknown as { __ctx?: CanvasRenderingContext2D };
			return (w.__ctx ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true })!);
		};
		const rgba = (css: string): number[] => {
			const c = ctx();
			c.clearRect(0, 0, 1, 1);
			c.fillStyle = '#000';
			c.fillStyle = css;
			c.fillRect(0, 0, 1, 1);
			const [r, g, b, a] = c.getImageData(0, 0, 1, 1).data;
			return [r, g, b, a / 255];
		};
		const over = (top: number[], bottom: number[]) => top.slice(0, 3).map((v, i) => v * top[3] + bottom[i] * (1 - top[3]));
		const behind = (start: Element | null): number[] => {
			const layers: number[][] = [];
			for (let node = start; node; node = node.parentElement) {
				const c = rgba(getComputedStyle(node).backgroundColor);
				if (c[3] > 0) layers.push(c);
				if (c[3] >= 1) break;
			}
			return layers.reverse().reduce((acc, layer) => over(layer, acc), [255, 255, 255]);
		};
		const lum = ([r, g, b]: number[]) => {
			const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
			return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
		};
		const contrast = (a: number[], b: number[]) => {
			const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
			return (hi + 0.05) / (lo + 0.05);
		};
		/** An element's own background painted over what is behind it */
		const fill = (el: Element) => over(rgba(getComputedStyle(el).backgroundColor), behind(el.parentElement));
		(window as unknown as { __colour: unknown }).__colour = { rgba, behind, contrast, fill };
	});
}

type Colour = {
	rgba: (css: string) => number[];
	behind: (el: Element | null) => number[];
	contrast: (a: number[], b: number[]) => number;
	fill: (el: Element) => number[];
};

for (const theme of ['light', 'dark'] as const) {
	test(`Settings switches reach 3:1, on and off, ${theme} theme`, async ({ page }) => {
		test.skip(!BOOK, 'no published book is synced');
		await seedSettings(page, { theme });
		await installColour(page);
		await page.goto(`/${BOOK}/`);
		const opener = page.getByRole('button', { name: 'Stillingar' }).first();
		const dialog = page.getByRole('dialog');
		// A click before the app hydrates opens nothing, so press until the dialog is up.
		await expect(async () => {
			if (!(await dialog.isVisible())) await opener.click();
			await expect(dialog).toBeVisible({ timeout: 2_000 });
		}).toPass({ timeout: 20_000 });
		const switches = dialog.getByRole('switch');
		expect(await switches.count()).toBeGreaterThanOrEqual(3);

		const failures: string[] = [];
		for (let i = 0; i < (await switches.count()); i++) {
			const toggle = switches.nth(i);
			const name = (await toggle.getAttribute('aria-labelledby')) ?? `switch ${i}`;
			for (let press = 0; press < 2; press++) {
				// The knob and the track move with a transition; measure them at rest.
				await page.waitForTimeout(250);
				const m = await toggle.evaluate((el) => {
					const c = (window as unknown as { __colour: Colour }).__colour;
					const knob = el.querySelector('span')!;
					const track = c.fill(el);
					return {
						state: el.getAttribute('aria-checked'),
						knob: c.contrast(c.fill(knob), track),
						track: c.contrast(track, c.behind(el.parentElement))
					};
				});
				if (m.knob < 3) failures.push(`${name} ${m.state}: knob on track ${m.knob.toFixed(2)}:1`);
				if (m.track < 3) failures.push(`${name} ${m.state}: track on the dialog ${m.track.toFixed(2)}:1`);
				await toggle.click();
			}
		}
		expect(failures).toEqual([]);
	});
}

for (const viewport of [
	{ width: 1280, height: 800 },
	{ width: 390, height: 844 }
]) {
	test(`on a paged section 'Næsta' is the largest filled control, at ${viewport.width} px`, async ({ page }) => {
		test.skip(!SECTION, 'no published book is synced');
		await page.setViewportSize(viewport);
		await seedSettings(page, { readingMode: 'paged' });
		await installColour(page);
		await page.goto(SECTION!);
		const next = page.getByRole('navigation', { name: 'Síðuflakk' }).getByRole('button', { name: 'Næsta síða' });
		await expect(next).toBeVisible({ timeout: 20_000 });
		await page.waitForTimeout(300);

		const filled = await page.evaluate(() => {
			const c = (window as unknown as { __colour: Colour }).__colour;
			const out: { name: string; area: number }[] = [];
			for (const el of document.querySelectorAll('button, a[href], [role="button"]')) {
				const r = el.getBoundingClientRect();
				if (r.width === 0 || r.height === 0 || el.closest('[hidden], [inert]')) continue;
				if (getComputedStyle(el).visibility === 'hidden') continue;
				const own = c.rgba(getComputedStyle(el).backgroundColor);
				if (own[3] < 0.9) continue;
				// Filled: its own background stands out from what is behind it.
				if (c.contrast(c.fill(el), c.behind(el.parentElement)) < 1.5) continue;
				out.push({ name: el.getAttribute('aria-label') || (el.textContent ?? '').trim().slice(0, 40), area: Math.round(r.width * r.height) });
			}
			return out.sort((a, b) => b.area - a.area);
		});
		expect(filled[0]?.name, JSON.stringify(filled.slice(0, 4))).toBe('Næsta síða');
	});
}
