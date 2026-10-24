// @vitest-environment node
/**
 * Colour-token contrast ratchet (reader-review plan step S1.1; register UI-24, UI-02).
 *
 * Reads the light (`:root`) and dark (`.dark`) colour tokens from `src/app.css` and checks
 * every pair below against WCAG 2.1: 4.5:1 for text (1.4.3), 3:1 for the focus ring (1.4.11).
 *
 * Today's failures are listed in KNOWN_FAILURES with the ratio measured on 2026-10-23.
 * The test fails when:
 *   - a pair that is not listed drops below its minimum (a new failure);
 *   - a listed pair gets worse than its recorded ratio;
 *   - a listed pair now passes: delete its entry as the fix lands (plan M2, UI-02).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const APP_CSS = fileURLToPath(new URL('../../app.css', import.meta.url));

type Tokens = Record<string, string>;

/** The custom properties declared in the first block whose selector is exactly `selector`. */
function tokenBlock(css: string, selector: string): Tokens {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
	if (!match) throw new Error(`No "${selector} {" block in src/app.css`);
	const body = match[1].replace(/\/\*[\s\S]*?\*\//g, '');
	return Object.fromEntries([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

function rgb(hex: string): [number, number, number] {
	let h = hex.trim().replace(/^#/, '');
	if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h)) throw new Error(`Not a hex colour: "${hex}"`);
	if (h.length === 3) h = [...h].map((c) => c + c).join('');
	return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

/** WCAG 2.x relative luminance. */
function luminance(hex: string): number {
	const [r, g, b] = rgb(hex).map((c) => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio, from 1 to 21. */
function contrastRatio(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

const SURFACES = ['--bg-primary', '--bg-secondary', '--bg-tertiary', '--accent-light', '--accent-subtle'];

interface Pair {
	fg: string;
	bg: string;
	min: number;
	use: string;
}

const PAIRS: Pair[] = [
	...['--text-primary', '--text-secondary', '--text-tertiary'].flatMap((fg) =>
		SURFACES.map((bg) => ({ fg, bg, min: 4.5, use: 'text on a surface' }))
	),
	// Amber used as text: links, 'Vistað', objective numbers, the sidebar's current section.
	...['--bg-primary', '--bg-secondary'].map((bg) => ({ fg: '--accent-color', bg, min: 4.5, use: 'amber text' })),
	// White text on the accent fill: .btn-accent, selected segments (see accentText.test.ts).
	{ fg: '#ffffff', bg: '--accent-color', min: 4.5, use: 'white on the accent fill' },
	{ fg: '#ffffff', bg: '--accent-hover', min: 4.5, use: 'white on the accent hover' },
	// The global *:focus-visible ring is var(--accent-color); it must stand out from the page.
	...['--bg-primary', '--bg-secondary'].map((bg) => ({ fg: '--accent-color', bg, min: 3, use: 'focus ring' }))
];

const key = (theme: string, p: Pair) => `${theme}: ${p.fg} on ${p.bg} (min ${p.min})`;

/** Measured on main 62ea95e, 2026-10-23. Remove an entry when its pair passes. */
const KNOWN_FAILURES: Record<string, number> = {
	'light: --text-tertiary on --bg-primary (min 4.5)': 2.9,
	'light: --text-tertiary on --bg-secondary (min 4.5)': 3.18,
	'light: --text-tertiary on --bg-tertiary (min 4.5)': 2.65,
	'light: --text-tertiary on --accent-light (min 4.5)': 2.95,
	'light: --text-tertiary on --accent-subtle (min 4.5)': 2.52,
	'light: --accent-color on --bg-primary (min 4.5)': 2.66,
	'light: --accent-color on --bg-secondary (min 4.5)': 2.92,
	'light: #ffffff on --accent-color (min 4.5)': 2.92,
	'light: #ffffff on --accent-hover (min 4.5)': 4.02,
	'light: --accent-color on --bg-primary (min 3)': 2.66,
	'light: --accent-color on --bg-secondary (min 3)': 2.92,
	'dark: --text-tertiary on --bg-primary (min 4.5)': 3.13,
	'dark: --text-tertiary on --bg-secondary (min 4.5)': 2.87,
	'dark: --text-tertiary on --bg-tertiary (min 4.5)': 2.6,
	'dark: --text-tertiary on --accent-light (min 4.5)': 2.67,
	'dark: --text-tertiary on --accent-subtle (min 4.5)': 2.4,
	'dark: #ffffff on --accent-color (min 4.5)': 2.08,
	'dark: #ffffff on --accent-hover (min 4.5)': 1.74
};

const css = readFileSync(APP_CSS, 'utf8');
const light = tokenBlock(css, ':root');
const THEMES: Record<string, Tokens> = { light, dark: { ...light, ...tokenBlock(css, '.dark') } };

function resolve(tokens: Tokens, name: string): string {
	if (name.startsWith('#')) return name;
	const value = tokens[name];
	if (!value) throw new Error(`Token ${name} is not defined`);
	return value;
}

describe('contrastRatio', () => {
	it('gives 21:1 for black on white', () => {
		expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
	});

	it('gives 1:1 for a colour on itself', () => {
		expect(contrastRatio('#c78c20', '#c78c20')).toBeCloseTo(1, 5);
	});
});

describe.each(Object.keys(THEMES))('%s theme tokens', (theme) => {
	it.each(PAIRS.map((p) => [key(theme, p), p] as const))('%s', (name, pair) => {
		const tokens = THEMES[theme];
		const ratio = contrastRatio(resolve(tokens, pair.fg), resolve(tokens, pair.bg));
		const known = KNOWN_FAILURES[name];
		if (ratio >= pair.min) {
			expect(known, `${name} passes now (${ratio.toFixed(2)}:1): delete it from KNOWN_FAILURES`).toBeUndefined();
			return;
		}
		expect(known, `${name} is ${ratio.toFixed(2)}:1, below ${pair.min}:1 (${pair.use})`).toBeDefined();
		expect(ratio, `${name} got worse than its recorded ${known}:1`).toBeGreaterThanOrEqual((known as number) - 0.005);
	});
});

describe('KNOWN_FAILURES', () => {
	it('lists only pairs this test checks', () => {
		const checked = new Set(Object.keys(THEMES).flatMap((t) => PAIRS.map((p) => key(t, p))));
		expect(Object.keys(KNOWN_FAILURES).filter((k) => !checked.has(k))).toEqual([]);
	});
});
