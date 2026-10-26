// @vitest-environment node
/**
 * One focus style for the whole app (reader-review plan step S2.2, decision D01, register UI-07).
 *
 * `src/app.css` holds the only focus style: a `*:focus-visible` rule that draws a 2 px
 * `--focus-ring` outline over a solid 2 px `--focus-gap`, so the ring's inner neighbour is a
 * known colour on every surface (tokens.test.ts holds both pairs to 3:1). This test fails when:
 *   - that rule is missing, doubled, changed, or moved into an `@layer` (or any other at-rule).
 *     Unlayered, it beats Tailwind's `focus:outline-none` and `focus:ring-*` utilities, which
 *     live in `@layer utilities`; inside a layer, those utilities would remove or replace it;
 *   - any other rule whose selector targets `:focus` or `:focus-visible` sets an outline or a
 *     box-shadow. `outline: none` there hides the ring (it hid it on in-text glossary terms and
 *     on the three search inputs); an outline of its own is a second ring at another colour
 *     (amber is 2.66-2.92:1 in light); a box-shadow covers the gap.
 *
 * Read: a .svelte file's <style>, every .css file under src, static/styles/content.css (linked
 * on every page), and the whole text of every non-test .ts file under src, so CSS injected from
 * a template string counts (practiceReveal.ts does that). `:focus-within` and selectors inside
 * `:not(...)` do not count: they style something other than the focused element.
 *
 * Not seen: an inline `style` attribute (PeriodicTable sets outlines that way for state, not
 * focus), and Tailwind classes in markup (`focus:outline-none` is harmless while this rule is
 * unlayered; that is what the first check pins).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const SRC = join(ROOT, 'src');
const APP_CSS = 'src/app.css';

export interface CssRule {
	selector: string;
	body: string;
	/** Preludes of the blocks this rule sits in, outermost first (e.g. `@layer base`). */
	ancestors: string[];
}

/**
 * The rule blocks in a stylesheet, with the at-rules around each. A small tokenizer, not a CSS
 * parser: comments are stripped, strings are not understood, and nested rules are read as
 * separate rules with their parent as an ancestor.
 */
export function cssRules(css: string): CssRule[] {
	const bare = css.replace(/\/\*[\s\S]*?\*\//g, '');
	const stack: string[] = [];
	const rules: CssRule[] = [];
	let buf = '';
	for (const ch of bare) {
		if (ch === '{') {
			stack.push(buf.trim());
			buf = '';
		} else if (ch === '}') {
			const prelude = stack.pop();
			if (prelude !== undefined && !prelude.startsWith('@')) {
				rules.push({ selector: prelude, body: buf, ancestors: [...stack] });
			}
			buf = '';
		} else if (ch === ';' && (stack.length === 0 || stack[stack.length - 1].startsWith('@'))) {
			// A statement at-rule (`@import "tailwindcss";`) or a declaration at the top of an
			// at-rule block: not part of the next rule's selector.
			buf = '';
		} else {
			buf += ch;
		}
	}
	return rules;
}

/** True if the selector list styles a focused element: `:focus` or `:focus-visible`, outside `:not(...)`. */
export function targetsFocus(selector: string): boolean {
	return /:focus(?:-visible)?(?![\w-])/.test(selector.replace(/:not\([^)]*\)/g, ''));
}

const SETS_RING = /(?:^|[;\s{])(outline(?:-[\w-]+)?|box-shadow)\s*:/;

/** The global rule, as app.css must write it (whitespace aside). */
const RING_RULE = {
	selector: '*:focus-visible',
	declarations: ['outline: 2px solid var(--focus-ring)', 'outline-offset: 2px', 'box-shadow: 0 0 0 2px var(--focus-gap)']
};

const isGlobalRing = (path: string, rule: CssRule) =>
	path === APP_CSS && rule.selector === RING_RULE.selector && rule.ancestors.length === 0;

/** Focus rules other than the global ring that set an outline or a box-shadow, as "path: selector". */
export function scopedFocusStyles(files: { path: string; css: string }[]): string[] {
	return files.flatMap(({ path, css }) =>
		cssRules(css)
			.filter((r) => targetsFocus(r.selector) && SETS_RING.test(r.body) && !isGlobalRing(path, r))
			.map((r) => `${path}: ${r.selector.split(/\s+/).join(' ')}`)
	);
}

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? walk(path) : [path];
	});
}

/** A .svelte file's <style> blocks; any other file whole. */
const cssOf = (path: string, text: string) =>
	path.endsWith('.svelte') ? [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n') : text;

const FILES = [
	...walk(SRC).filter((f) => /\.(svelte|css|ts)$/.test(f) && !/\.(test|spec)\./.test(f)),
	join(ROOT, 'static/styles/content.css')
].map((f) => {
	const path = relative(ROOT, f).split('\\').join('/');
	return { path, css: cssOf(path, readFileSync(f, 'utf8')) };
});

const appRules = cssRules(FILES.find((f) => f.path === APP_CSS)!.css);
const normalise = (s: string) => s.replace(/\s+/g, ' ').trim();

describe('the global focus ring (S2.2, D01)', () => {
	it('app.css has exactly one *:focus-visible rule, outside every @layer and at-rule', () => {
		const found = appRules.filter((r) => r.selector === RING_RULE.selector);
		expect(found.map((r) => r.ancestors)).toEqual([[]]);
	});

	it('it draws --focus-ring, 2 px wide, 2 px out, over a 2 px --focus-gap', () => {
		const rule = appRules.find((r) => isGlobalRing(APP_CSS, r));
		const declarations = (rule?.body ?? '').split(';').map(normalise).filter(Boolean);
		expect(declarations).toEqual(RING_RULE.declarations);
	});

	it('no other :focus-visible rule sits inside an @layer in app.css', () => {
		const layered = appRules.filter((r) => targetsFocus(r.selector) && r.ancestors.some((a) => a.startsWith('@layer')));
		expect(layered.map((r) => r.selector)).toEqual([]);
	});

	it('no other :focus or :focus-visible rule sets an outline (none included) or a box-shadow', () => {
		expect(scopedFocusStyles(FILES), 'leave the ring to *:focus-visible in src/app.css (UI-07)').toEqual([]);
	});
});

describe('the scanner', () => {
	it('finds a scoped outline: none, a second ring and a halo, and nothing else', () => {
		const css = `
			.a:focus { outline: none; border-color: red; }
			.b:focus-visible { outline: 2px solid var(--accent-color); }
			.c:focus { box-shadow: 0 0 0 3px red; }
			.d:focus-within .e { opacity: 1; }
			.f:not(:focus-visible) { opacity: 0.4; }
			.g:focus { background-color: red; }
			.h:hover { outline: none; }`;
		expect(scopedFocusStyles([{ path: 'x.css', css }])).toEqual(['x.css: .a:focus', 'x.css: .b:focus-visible', 'x.css: .c:focus']);
	});

	it('reads the at-rules around a rule, so a layered ring is caught', () => {
		const rules = cssRules('@import "tailwindcss";\n@layer base { *:focus-visible { outline: none; } }\n*:focus-visible { outline: 0; }');
		expect(rules.map((r) => [r.selector, r.ancestors])).toEqual([
			['*:focus-visible', ['@layer base']],
			['*:focus-visible', []]
		]);
	});

	it('counts a rule only in its own file: the global ring outside app.css is a scoped style', () => {
		const css = '*:focus-visible { outline: 2px solid var(--focus-ring); }';
		expect(scopedFocusStyles([{ path: 'src/other.css', css }])).toEqual(['src/other.css: *:focus-visible']);
		expect(scopedFocusStyles([{ path: APP_CSS, css }])).toEqual([]);
	});
});
