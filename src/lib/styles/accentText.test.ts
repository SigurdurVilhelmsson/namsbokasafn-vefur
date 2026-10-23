// @vitest-environment node
/**
 * White text on the accent fill (reader-review plan step S1.1; register UI-24, UI-02).
 *
 * White on `--accent-color` is 2.92:1 in light and 2.08:1 in dark, below the 4.5:1 that
 * body-size text needs (see tokens.test.ts). This test counts, per file, the two ways the
 * app puts white text on that fill, and fails on any new one:
 *   - CLASS STRINGS: a line of a .svelte file holding both `bg-[var(--accent-color)]` and
 *     `text-white`. Line-based on purpose: it is the review's measure (14 in 10 files on
 *     main 3dbf50b), and a quoted-string parser miscounted on Svelte templates. A class
 *     string split over two lines is not seen.
 *   - CSS RULES: one rule block, in a .svelte <style> or a .css file, that sets a background
 *     of var(--accent-color) or var(--accent-hover) and `color` white (22 in 17 files).
 *
 * When a fix removes some, lower the counts below: the test fails until you do, so the
 * baseline only ever shrinks (plan M2 replaces them with an --on-accent token).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const SRC = join(ROOT, 'src');

/** Measured on main 62ea95e, 2026-10-23: 14 lines in 10 files. */
const CLASS_STRING_BASELINE: Record<string, number> = {
	'src/lib/components/DownloadBookButton.svelte': 2,
	'src/lib/components/ErrorMessage.svelte': 1,
	'src/lib/components/FlashcardModal.svelte': 1,
	'src/lib/components/KeyboardShortcutsModal.svelte': 1,
	'src/lib/components/NoteModal.svelte': 1,
	'src/lib/components/PWAUpdater.svelte': 1,
	'src/lib/components/SettingsModal.svelte': 2,
	'src/lib/components/analytics/GoalsTab.svelte': 2,
	'src/routes/[bookSlug]/kafli/[chapterSlug]/[sectionSlug]/+page.svelte': 1,
	'src/routes/[bookSlug]/yfirlit/+page.svelte': 2
};

/** Measured on main 62ea95e, 2026-10-23: 22 rules in 17 files. */
const CSS_RULE_BASELINE: Record<string, number> = {
	'src/app.css': 2,
	'src/lib/components/AdaptiveQuiz.svelte': 1,
	'src/lib/components/NavigationButtons.svelte': 1,
	'src/lib/components/PeriodicTable.svelte': 1,
	'src/lib/components/layout/MobileBottomNav.svelte': 1,
	'src/lib/components/layout/Sidebar.svelte': 1,
	'src/lib/components/study/PhaseProgress.svelte': 1,
	'src/lib/components/study/ReadingPhase.svelte': 1,
	'src/lib/components/study/SessionComplete.svelte': 1,
	'src/lib/components/study/SessionPlanner.svelte': 1,
	'src/routes/+page.svelte': 1,
	'src/routes/[bookSlug]/+page.svelte': 1,
	'src/routes/[bookSlug]/atridiordasskra/+page.svelte': 2,
	'src/routes/[bookSlug]/minniskort/+page.svelte': 3,
	'src/routes/[bookSlug]/ordabok/+page.svelte': 1,
	'src/routes/feedback/+page.svelte': 1,
	'src/routes/for-teachers/+page.svelte': 2
};

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? walk(path) : [path];
	});
}

const FILES = walk(SRC)
	.filter((f) => /\.(svelte|css)$/.test(f) && !/\.(test|spec)\./.test(f))
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

const ACCENT_BACKGROUND = /background(?:-color)?\s*:[^;]*var\(\s*--accent-(?:color|hover)\s*\)/i;
const WHITE_COLOR = /(?<![-\w])color\s*:\s*(?:white|#fff(?:fff)?\b|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))/i;

/** Rule blocks that set both, per file. Nested at-rules count their inner blocks. */
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
		expect(over, 'new white-on-accent class strings: use a token that passes 4.5:1 (UI-02)').toEqual([]);
	});

	it('class strings: the baseline still matches (lower it as fixes land)', () => {
		expect(countClassStrings(FILES)).toEqual(CLASS_STRING_BASELINE);
	});

	it('CSS rules: no new file, and no file above its baseline', () => {
		const found = countCssRules(FILES);
		const over = Object.entries(found).filter(([f, n]) => n > (CSS_RULE_BASELINE[f] ?? 0));
		expect(over, 'new white-on-accent CSS rules: use a token that passes 4.5:1 (UI-02)').toEqual([]);
	});

	it('CSS rules: the baseline still matches (lower it as fixes land)', () => {
		expect(countCssRules(FILES)).toEqual(CSS_RULE_BASELINE);
	});

	it('the baselines hold the counts the review measured: 14 class strings, 22 CSS rules', () => {
		expect([total(CLASS_STRING_BASELINE), Object.keys(CLASS_STRING_BASELINE).length]).toEqual([14, 10]);
		expect([total(CSS_RULE_BASELINE), Object.keys(CSS_RULE_BASELINE).length]).toEqual([22, 17]);
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
});
