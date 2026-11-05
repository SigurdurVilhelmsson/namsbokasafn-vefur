// @vitest-environment node
/**
 * The section toolbar's icon buttons (print, PDF, share, notes, bookmark) identify controls,
 * so their icons need 3:1 against what is behind them (WCAG 1.4.11). axe cannot measure an
 * icon, so this test pins the colour instead: the resting icon uses --text-tertiary, which
 * tokens.test.ts holds to 4.5:1 on every surface in both themes.
 *
 * Until 2026-11-05 they were text-gray-400 (#9ca3af), about 2.5:1 on white.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const SECTION_PAGE = '../../routes/[bookSlug]/kafli/[chapterSlug]/[sectionSlug]/+page.svelte';
const PDF_BUTTON = '../components/PdfDownloadButton.svelte';

/** The toolbar's markup: from the print button to the mark-as-read block. */
function toolbar(): string {
	const page = read(SECTION_PAGE);
	const start = page.indexOf('<!-- Print button -->');
	const end = page.indexOf('{#if !isRead}', start);
	if (start < 0 || end < 0) throw new Error('Section toolbar markers not found in the section page');
	return page.slice(start, end);
}

function rgb(hex: string): number[] {
	const h = hex.replace('#', '');
	return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function luminance(hex: string): number {
	const [r, g, b] = rgb(hex).map((c) => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

describe('section toolbar icons', () => {
	it('rest on --text-tertiary, never a gray utility that fails 3:1', () => {
		const bar = toolbar();
		expect(bar).not.toMatch(/(?<![:\w-])text-gray-(300|400)\b/);
		// print, share, notes, bookmark: four buttons in the page itself
		expect(bar.match(/(?<![:\w-])text-\[var\(--text-tertiary\)\]/g)?.length).toBe(4);
	});

	it('the PDF icon button rests on --text-tertiary too', () => {
		const css = read(PDF_BUTTON);
		const rule = css.match(/\.pdf-btn-icon\s*\{([^}]*)\}/);
		expect(rule, '.pdf-btn-icon rule').not.toBeNull();
		expect(rule![1]).toMatch(/color:\s*var\(--text-tertiary\)/);
	});

	it('control: the old colour fails 3:1 on white and the light token passes on the hover fill', () => {
		// The control proves the arithmetic sees the defect this test exists for.
		expect(contrast('#9ca3af', '#ffffff')).toBeLessThan(3);
		const tertiary = read('../../app.css').match(/--text-tertiary:\s*(#[0-9a-f]{6})/i)![1];
		expect(contrast(tertiary, '#f3f4f6')).toBeGreaterThanOrEqual(3); // hover:bg-gray-100
	});
});
