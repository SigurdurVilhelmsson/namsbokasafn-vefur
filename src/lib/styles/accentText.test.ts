// @vitest-environment node
/**
 * White text on the accent fill (reader-review plan steps S1.1 and S2.1; register UI-24, UI-02).
 *
 * White on `--accent-color` is 2.92:1 in light and 2.08:1 in dark, below the 4.5:1 that
 * body-size text needs (see tokens.test.ts). Decision D01 puts ink on the fill instead,
 * `--on-accent` (5.12:1 light, 8.66:1 dark). This test counts, per file, the two ways the
 * app has put white text on that fill, and fails on any new one:
 *   - CLASS STRINGS: a line of a .svelte file holding both `bg-[var(--accent-color)]` and
 *     `text-white`. Line-based on purpose: it is the review's measure (14 in 10 files on
 *     main 3dbf50b), and a quoted-string parser miscounted on Svelte templates. A class
 *     string split over two lines is not seen.
 *   - CSS RULES: one rule block that sets a background of var(--accent-color) or
 *     var(--accent-hover), with or without a fallback (`var(--accent-color, #c78c20)`), and
 *     `color` white: `white`, `#fff` or `#ffffff` in any case (with or without an alpha
 *     digit pair), or `rgb()`/`rgba()` of three 255s at any alpha. It reads a .svelte file's
 *     <style>, a whole .css file, and the whole text of every .ts file under src except
 *     *.test.ts and *.spec.ts, so rules in template strings count (practiceReveal.ts injects
 *     its CSS that way). 22 rules in 17 files at the review.
 *
 * Not seen: white set in markup over a fill set in CSS (an icon's `text-white` inside a box
 * whose CSS paints the accent), white set in a different rule block from the fill, a
 * `text-white/80` class, a `bg-[var(--accent-hover)]` class, and `fill`/`stroke` white.
 *
 * The baselines are empty since plan step S2.1: no white text may sit on the accent fill.
 * Use `text-[var(--on-accent)]` or `color: var(--on-accent)`, at full opacity.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const SRC = join(ROOT, 'src');

/** Empty since S2.1. The review measured 14 lines in 10 files (main 62ea95e, 2026-10-23). */
const CLASS_STRING_BASELINE: Record<string, number> = {};

/** Empty since S2.1. The review measured 22 rules in 17 files (main 62ea95e, 2026-10-23). */
const CSS_RULE_BASELINE: Record<string, number> = {};

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? walk(path) : [path];
	});
}

/** The files the scanners read: .svelte, .css and .ts, but no test or spec file. */
export function isScanned(path: string): boolean {
	return /\.(svelte|css|ts)$/.test(path) && !/\.(test|spec)\./.test(path);
}

const FILES = walk(SRC)
	.filter(isScanned)
	.map((f) => ({ path: relative(ROOT, f).split('\\').join('/'), text: readFileSync(f, 'utf8') }));

const ACCENT_FILL_CLASS = /bg-\[var\(--accent-color\)\]/;
const TEXT_WHITE_CLASS = /(^|[\s'"`])text-white(?=[\s'"`]|$)/;

/** Lines holding both classes, per file. */
export function countClassStrings(files: { path: string; text: string }[]): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const { path, text } of files) {
		if (!path.endsWith('.svelte')) continue;
		const n = text.split('\n').filter((l) => ACCENT_FILL_CLASS.test(l) && TEXT_WHITE_CLASS.test(l)).length;
		if (n > 0) counts[path] = n;
	}
	return counts;
}

/** The fill, as `var(--accent-color)` or with a fallback: `var(--accent-color, #c78c20)`. */
const ACCENT_BACKGROUND = /background(?:-color)?\s*:[^;]*var\(\s*--accent-(?:color|hover)\s*(?:,[^)]*)?\)/i;
/** White at any alpha: white, #fff, #ffffff (any case, optional alpha), rgb()/rgba() of 255s. */
const WHITE_COLOR =
	/(?<![-\w])color\s*:\s*(?:white|#fff(?:[0-9a-f]|fff(?:[0-9a-f]{2})?)?\b|rgba?\(\s*255\s*,?\s*255\s*,?\s*255\s*(?:[,/][^)]*)?\))/i;

/**
 * Rule blocks that set both, per file. Nested at-rules count their inner blocks. A .svelte
 * file is read for its <style> only; any other file (.css, .ts) is read whole, as CSS.
 */
export function countCssRules(files: { path: string; text: string }[]): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const { path, text } of files) {
		const css = path.endsWith('.svelte')
			? [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n')
			: text;
		const bare = css.replace(/\/\*[\s\S]*?\*\//g, '');
		let n = 0;
		for (const [, , body] of bare.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
			if (ACCENT_BACKGROUND.test(body) && WHITE_COLOR.test(body)) n++;
		}
		if (n > 0) counts[path] = n;
	}
	return counts;
}

const total = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

describe('white text on the accent fill', () => {
	it('class strings: no new file, and no file above its baseline', () => {
		const found = countClassStrings(FILES);
		const over = Object.entries(found).filter(([f, n]) => n > (CLASS_STRING_BASELINE[f] ?? 0));
		expect(over, 'white-on-accent class strings: use text-[var(--on-accent)] (D01, UI-02)').toEqual([]);
	});

	it('class strings: the baseline still matches', () => {
		expect(countClassStrings(FILES)).toEqual(CLASS_STRING_BASELINE);
	});

	it('CSS rules: no new file, and no file above its baseline', () => {
		const found = countCssRules(FILES);
		const over = Object.entries(found).filter(([f, n]) => n > (CSS_RULE_BASELINE[f] ?? 0));
		expect(over, 'white-on-accent CSS rules: use color: var(--on-accent) (D01, UI-02)').toEqual([]);
	});

	it('CSS rules: the baseline still matches', () => {
		expect(countCssRules(FILES)).toEqual(CSS_RULE_BASELINE);
	});

	// Only ever down from the review's counts: lowering a baseline as a fix lands is the point.
	it("the baselines never exceed the review's counts: 14 class strings in 10 files, 22 CSS rules in 17", () => {
		expect(total(CLASS_STRING_BASELINE)).toBeLessThanOrEqual(14);
		expect(Object.keys(CLASS_STRING_BASELINE).length).toBeLessThanOrEqual(10);
		expect(total(CSS_RULE_BASELINE)).toBeLessThanOrEqual(22);
		expect(Object.keys(CSS_RULE_BASELINE).length).toBeLessThanOrEqual(17);
	});
});

describe('the scanners', () => {
	it('count a class string with both classes, and not one with only one', () => {
		const files = [
			{ path: 'a.svelte', text: `<b class="bg-[var(--accent-color)] text-white">x</b>\n<b class="bg-[var(--accent-color)]">y</b>` }
		];
		expect(countClassStrings(files)).toEqual({ 'a.svelte': 1 });
	});

	it('count a rule that sets both in one block, and not one split over two blocks', () => {
		const files = [
			{
				path: 'a.css',
				text: `.a { background: var(--accent-color); color: white; }\n.b { background-color: var(--accent-color); }\n.b { color: #fff; }\n.c { border-color: white; background: var(--accent-hover); }`
			}
		];
		expect(countCssRules(files)).toEqual({ 'a.css': 1 });
	});

	it('count a fill written with a fallback, and not another accent token with one', () => {
		const files = [
			{
				path: 'a.css',
				text: `.a { background: var(--accent-color, #c78c20); color: white; }\n.b { background-color: var(--accent-hover, #b37a1c); color: white; }\n.c { background: var(--accent-light, rgba(199, 140, 32, 0.1)); color: white; }`
			}
		];
		expect(countCssRules(files)).toEqual({ 'a.css': 2 });
	});

	it('count white written as rgb() or rgba() at any alpha', () => {
		const files = [
			{
				path: 'a.css',
				text: `.a { background: var(--accent-color); color: rgba(255, 255, 255, 0.8); }\n.b { background: var(--accent-color); color: rgb(255 255 255 / 80%); }\n.c { background: var(--accent-color); color: rgba(255, 255, 255, 1); }`
			}
		];
		expect(countCssRules(files)).toEqual({ 'a.css': 3 });
	});

	// #FFFFFF and #Fff matched before S2.1 too (the regex is case-insensitive); the alpha form did not.
	it('count white written as hex in any case, with or without alpha, and not a near-white tint', () => {
		const files = [
			{
				path: 'a.css',
				text: `.a { background: var(--accent-color); color: #FFFFFF; }\n.b { background: var(--accent-color); color: #Fff; }\n.c { background: var(--accent-color); color: #ffffffcc; }\n.d { background: var(--accent-color); color: #fffbeb; }`
			}
		];
		expect(countCssRules(files)).toEqual({ 'a.css': 3 });
	});

	it('read .ts files, and no test or spec file', () => {
		expect(isScanned('src/lib/actions/practiceReveal.ts')).toBe(true);
		expect(isScanned('src/lib/stores/x.svelte.ts')).toBe(true);
		expect(isScanned('src/lib/components/A.svelte')).toBe(true);
		expect(isScanned('src/app.css')).toBe(true);
		expect(isScanned('src/lib/styles/accentText.test.ts')).toBe(false);
		expect(isScanned('src/lib/utils/x.spec.ts')).toBe(false);
	});

	it('the file list holds .ts files from src, and no test file', () => {
		expect(FILES.some((f) => f.path.endsWith('.ts'))).toBe(true);
		expect(FILES.some((f) => /\.(test|spec)\./.test(f.path))).toBe(false);
	});

	it('count a rule inside a template string in a .ts file', () => {
		const files = [
			{
				path: 'a.ts',
				text: 'const STYLE = `\n.t:hover { background: var(--accent-color); color: #fff; }\n.u { color: #fff; }\n`;\nexport function f() { return { a: 1 }; }'
			}
		];
		expect(countCssRules(files)).toEqual({ 'a.ts': 1 });
	});
});
