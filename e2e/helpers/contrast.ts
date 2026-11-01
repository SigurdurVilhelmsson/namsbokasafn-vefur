// Moved from e2e/accent-contrast.spec.ts in plan step S5.5, so recall-prompt.spec.ts can measure
// text that axe cannot (a modal dialog in the top layer).
import type { Page } from '@playwright/test';

/**
 * WCAG 2.x contrast of an element's text colour against the background it is painted on: the
 * element's own background and its ancestors', translucent layers composited over the next one.
 * It throws if the text or an ancestor is faded with `opacity`: S2.1 forbids fading text over a
 * fill or in --accent-strong, and a group opacity is not in the colours this function reads.
 */
export async function textContrast(page: Page, selector: string): Promise<number> {
	return page.locator(selector).first().evaluate((el) => {
		for (let n: Element | null = el; n; n = n.parentElement) {
			const opacity = getComputedStyle(n).opacity;
			if (opacity !== '1') throw new Error(`opacity ${opacity} on ${n.tagName.toLowerCase()}.${n.className}`);
		}
		type RGBA = [number, number, number, number];
		const probe = document.createElement('canvas').getContext('2d')!;
		// Let the canvas normalise any CSS colour (rgb(), color(srgb …), color-mix() results).
		const parse = (css: string): RGBA => {
			probe.clearRect(0, 0, 1, 1);
			probe.fillStyle = '#000';
			probe.fillStyle = css;
			probe.fillRect(0, 0, 1, 1);
			const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
			return [r, g, b, a / 255];
		};
		const over = (top: RGBA, bottom: RGBA): RGBA => {
			const a = top[3] + bottom[3] * (1 - top[3]);
			if (a === 0) return [0, 0, 0, 0];
			const mix = (i: number) => (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / a;
			return [mix(0), mix(1), mix(2), a];
		};
		let bg: RGBA = [0, 0, 0, 0];
		for (let n: Element | null = el; n && bg[3] < 1; n = n.parentElement) {
			bg = over(bg, parse(getComputedStyle(n).backgroundColor));
		}
		bg = over(bg, [255, 255, 255, 1]);
		const fg = over(parse(getComputedStyle(el).color), bg);
		const lum = ([r, g, b]: RGBA) => {
			const c = [r, g, b].map((v) => {
				const s = v / 255;
				return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
			});
			return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
		};
		const [hi, lo] = [lum(fg), lum(bg)].sort((x, y) => y - x);
		return (hi + 0.05) / (lo + 0.05);
	});
}
