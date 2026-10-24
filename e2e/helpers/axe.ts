/**
 * Accessibility ratchet (reader-review plan step S1.1; register UI-24).
 *
 * `scanSurface()` runs axe-core's WCAG 2.1 A and AA rules on one surface, at one width and
 * in one theme, and compares the failing elements with `e2e/a11y-baseline.json`:
 *   - a failing element that is not in the baseline FAILS the test (a new failure);
 *   - a baseline entry that no longer fails is reported as an annotation, and fails only
 *     with A11Y_STRICT=1, because this machine's content and CI's differ;
 *   - A11Y_UPDATE_BASELINE=1 rewrites this scan's entries instead of comparing, and
 *     A11Y_UPDATE_BASELINE=merge adds to them (run either with --workers=1, so two scans
 *     never write the file at once).
 *
 * An element is keyed by its rule, axe's selector for it and its own tag and classes, with
 * the parts that change with content or with any CSS edit removed: positions
 * (`:nth-child(3)`), attribute values (`[href$="…"]`) and Svelte's hashed classes
 * (`.svelte-1x2y3z`). A selector left as a bare tag (`a`) also names the landmark the
 * element sits in (`in footer`), so it does not stand for every such element on the page.
 * So a new failure of the same kind of element in the same place does not show, but a new
 * kind of failure does.
 *
 * axe picks its selector from class and attribute counts over the whole document, so an
 * unrelated change can give an unchanged failure a new selector. The scan then reports it
 * as new and names the baseline entry it most likely replaced; rewrite the baseline.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASELINE_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'a11y-baseline.json');

/** The rules every scan runs: WCAG 2.0 and 2.1, levels A and AA. */
export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

interface Baseline {
	about: string;
	tags: string[];
	scans: Record<string, string[]>;
}

function readBaseline(): Baseline {
	if (!existsSync(BASELINE_FILE)) return { about: '', tags: WCAG_TAGS, scans: {} };
	return JSON.parse(readFileSync(BASELINE_FILE, 'utf8')) as Baseline;
}

/**
 * axe's selector with positions, attribute selectors and Svelte's hashed classes removed.
 * Only an unescaped `[` opens an attribute selector: Tailwind classes such as
 * `.bg-\[var\(--accent-color\)\]` keep their escaped brackets.
 */
export function normaliseSelector(selector: string): string {
	return selector
		.replace(/:nth-(?:last-)?(?:child|of-type)\([^)]*\)/g, '')
		.replace(/(?<!\\)\[(?:[^\]\\]|\\.)*\]/g, '')
		.replace(/\.svelte-[a-z0-9]+/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

/** `tag.class.class` of the element's opening tag in axe's html snippet, without Svelte hashes. */
export function elementSignature(html: string): string {
	const open = html.match(/^<([a-zA-Z][\w-]*)([^>]*)>/);
	if (!open) return '?';
	const classAttr = open[2].match(/\sclass="([^"]*)"/);
	const classes = (classAttr ? classAttr[1] : '')
		.split(/\s+/)
		.filter((c) => c && !/^svelte-[a-z0-9]+$/.test(c))
		.sort();
	return [open[1].toLowerCase(), ...classes].join('.');
}

/**
 * "rule | selector | element". The element's classes are added only when the selector is a
 * bare tag (`a`), to tell such elements apart: elsewhere the selector already names an id
 * or a class, and the element's long list of utility classes would re-key the entry on
 * every styling change.
 */
export function entryKey(rule: string, target: unknown, html: string, landmark = ''): string {
	let selector = normaliseSelector((Array.isArray(target) ? target.flat(3) : [target]).map(String).join(' >>> ')) || '*';
	const signature = elementSignature(html);
	const bare = !/[#.]/.test(selector);
	if (bare && landmark) selector = `${selector} in ${landmark}`;
	const element = bare ? signature : signature.split('.')[0];
	return `${rule} | ${selector} | ${element}`;
}

/** The landmark an element sits in, as `tag` or `tag#id` (e.g. `footer`, `aside`), or `body`. */
async function landmarkOf(page: Page, target: unknown): Promise<string> {
	const selector = (Array.isArray(target) ? target : [target]).map(String)[0];
	return page.evaluate((sel) => {
		let el: Element | null;
		try {
			el = document.querySelector(sel);
		} catch {
			return '';
		}
		const lm = el?.closest('header, nav, main, aside, footer, [role="dialog"], [role="tablist"], form, fieldset');
		if (!lm) return 'body';
		const role = lm.getAttribute('role');
		return lm.tagName.toLowerCase() + (role ? `[role=${role}]` : '') + (lm.id ? `#${lm.id}` : '');
	}, selector);
}

export interface ScanOptions {
	/** Baseline key, e.g. "section 390 dark". */
	name: string;
	/** Scan only inside this selector (e.g. a dialog). */
	include?: string;
	/** Never scan inside these selectors. */
	exclude?: string[];
}

/**
 * Hold the page still, so colours are measured at rest. The stylesheet stops CSS
 * transitions and animations. Svelte's transition:/in:/out: run on element.animate(),
 * which no stylesheet reaches, so those are finished here; Svelte may start the real one
 * a frame later, so repeat until a frame passes with nothing left running.
 */
export async function settle(page: Page): Promise<void> {
	await page.addStyleTag({
		content: '*, *::before, *::after { transition: none !important; animation: none !important; }'
	});
	await page.evaluate(async () => {
		await document.fonts.ready;
		for (let i = 0; i < 20; i++) {
			await new Promise((r) => requestAnimationFrame(() => r(null)));
			const running = document.getAnimations().filter((a) => a.playState !== 'finished' && a.playState !== 'idle');
			if (running.length === 0) return;
			for (const a of running) {
				try {
					a.finish();
				} catch {
					a.cancel(); // an infinite animation cannot finish
				}
			}
		}
	});
}

export async function scanSurface(page: Page, opts: ScanOptions): Promise<void> {
	let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
	if (opts.include) builder = builder.include(opts.include);
	for (const sel of opts.exclude ?? []) builder = builder.exclude(sel);
	const results = await builder.analyze();

	const found = new Map<string, string>();
	for (const v of results.violations) {
		for (const node of v.nodes) {
			const bare = !/[#.]/.test(normaliseSelector((Array.isArray(node.target) ? node.target.flat(3) : [node.target]).map(String).join(' >>> ')));
			const k = entryKey(v.id, node.target, node.html, bare ? await landmarkOf(page, node.target) : '');
			if (!found.has(k)) found.set(k, `${v.id} (${v.impact}): ${node.html.slice(0, 160)}\n    ${v.helpUrl}`);
		}
	}
	const current = [...found.keys()].sort();

	if (process.env.A11Y_UPDATE_BASELINE) {
		const workers = test.info().config.workers;
		if (workers > 1) throw new Error(`Update the baseline with --workers=1 (this run has ${workers})`);
		const baseline = readBaseline();
		baseline.about =
			'Accessibility ratchet baseline (plan step S1.1). Each scan lists the failing elements it may have: ' +
			'"rule | selector | element". See e2e/helpers/axe.ts. Drop an entry when its fix lands.';
		baseline.tags = WCAG_TAGS;
		// "merge" keeps what is there and adds this run's entries: how one baseline covers
		// two content setups (a checkout with every book, and CI's published book alone).
		const keep = process.env.A11Y_UPDATE_BASELINE === 'merge' ? (baseline.scans[opts.name] ?? []) : [];
		baseline.scans[opts.name] = [...new Set([...keep, ...current])].sort();
		baseline.scans = Object.fromEntries(Object.entries(baseline.scans).sort(([a], [b]) => a.localeCompare(b)));
		writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, '\t') + '\n');
		return;
	}

	const allowed = readBaseline().scans[opts.name];
	expect(allowed, `No baseline for "${opts.name}": run with A11Y_UPDATE_BASELINE=1 --workers=1`).toBeDefined();
	const allowedSet = new Set(allowed);
	const added = current.filter((k) => !allowedSet.has(k));
	const fixed = (allowed ?? []).filter((k) => !found.has(k));

	if (fixed.length > 0) {
		const msg = `${fixed.length} baseline entr${fixed.length === 1 ? 'y' : 'ies'} no longer fail on "${opts.name}": ${fixed.join('; ')}`;
		test.info().annotations.push({ type: 'a11y-baseline', description: msg });
		// Annotations reach only the HTML report; print it too, and mark it in GitHub's log.
		console.warn(`a11y-baseline: ${msg}. Delete them (CLAUDE.md, "Accessibility ratchet").`);
		if (process.env.GITHUB_ACTIONS) {
			console.log(`::warning title=a11y-baseline::${msg.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')}`);
		}
	}

	// An entry that is new while one with the same rule and element went away is most
	// likely the same failure under a new selector (see the note at the top).
	const element = (k: string) => [k.split(' | ')[0], k.split(' | ')[2]].join(' | ');
	const detail = added
		.map((k) => {
			const was = fixed.filter((f) => element(f) === element(k));
			const hint = was.length ? `\n    maybe re-keyed, was: ${was.join(' OR ')}` : '';
			return `  ${k}\n    ${found.get(k)}${hint}`;
		})
		.join('\n');
	expect(added, `New accessibility failures on "${opts.name}":\n${detail}`).toEqual([]);
	if (process.env.A11Y_STRICT) {
		expect(fixed, `Baseline entries that no longer fail on "${opts.name}": delete them`).toEqual([]);
	}
}

/**
 * Visible text fields inside `scope` whose only name would be their placeholder: axe's
 * label rule accepts a placeholder, which disappears as soon as the reader types.
 */
export async function fieldsLabelledOnlyByPlaceholder(page: Page, scope = 'body'): Promise<string[]> {
	return page.locator(scope).evaluateAll((roots) => {
		const out: string[] = [];
		for (const root of roots) {
			const fields = root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
				'textarea, input:not([type]), input[type="text"], input[type="search"], input[type="email"], input[type="url"], input[type="number"]'
			);
			for (const f of fields) {
				const visible = !!(f.offsetWidth || f.offsetHeight || f.getClientRects().length);
				if (!visible) continue;
				const named =
					f.getAttribute('aria-label')?.trim() ||
					f.getAttribute('aria-labelledby')?.trim() ||
					(f.id && document.querySelector(`label[for="${CSS.escape(f.id)}"]`)) ||
					f.closest('label');
				if (!named) out.push(f.outerHTML.slice(0, 120));
			}
		}
		return out;
	});
}
