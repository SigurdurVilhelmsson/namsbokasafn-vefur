#!/usr/bin/env node
/**
 * check-content-renames.js — before a content deploy, find every published page
 * the new tree retires, say whether a redirect covers it, and print the rows
 * that are missing, ready to paste.
 *
 * A section's file name comes from its title, so a re-render that corrects a
 * title renames the page and retires its URL. efni's slug map cannot see
 * renames from before its prune-on-rename, so this compares the two trees
 * themselves, paired on `data-module-id` (CLAUDE.md, "A rename retires a reader
 * URL"):
 *   - same module, new file name: a RENAME, which needs a row in
 *     `src/lib/data/sectionRedirects.ts` with that from and to. An appendix
 *     needs none while its number, and so its letter, stays the same: its
 *     address is /vidauki/<letter>/ (generate-toc.js `appendixLetter()`);
 *   - module gone: a DELETION, which is a stop unless it was expected.
 *
 * It also checks every row the book already has. The route redirects one hop,
 * and only to a published target, so a row whose target the new tree renames
 * again leaves its old address a 404: a STALE row. It names the module's page
 * in the new tree as the row's new target.
 *
 * Usage:
 *   node scripts/check-content-renames.js [--book <slug>] [--redirects <file>] <before-book-dir> <after-book-dir>
 *   Before the sync, to write the rows: the lane's copy of the book against
 *   efni's prepared tree, `<efni>/books/<book>/05-publication/mt-preview`, with
 *   --book, since that folder is not named after the book. After the sync: a
 *   copy of static/content/<book> taken before it, against static/content/<book>.
 *   --book defaults to the after folder's name, and must be a known book.
 *   --redirects <file> reads the rows from that file instead of
 *   src/lib/data/sectionRedirects.ts, e.g. a draft of it.
 *
 * Exit 0 when every removed page has its redirect and no row is stale; 1
 * otherwise; 2 on a usage error. Read-only.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { KNOWN_BOOKS } from './lib/published-books.js';
import { appendixLetter } from './generate-toc.js';

const MODULE_ID = /data-module-id="([^"]+)"/;
const REDIRECTS_PATH = 'src/lib/data/sectionRedirects.ts';
const APPENDICES = 'appendices';
const FIELD = (name) => new RegExp(`\\b${name}:\\s*'([^']*)'`);
const ROW_FIELDS = ['bookSlug', 'fromChapter', 'fromSlug', 'toChapter', 'toSlug', 'moduleId'];

const pageKey = (chapter, slug) => `${chapter}/${slug}`;
const naturalOrder = (a, b) => a.localeCompare(b, 'en', { numeric: true });

/**
 * The rows of sectionRedirects.ts, read as text: each `{ … }` holding a
 * fromSlug. Fields are read one by one, so their order does not matter.
 * `moduleId` is null when a row lacks it; the other five are required.
 * @returns {{bookSlug, fromChapter, fromSlug, toChapter, toSlug, moduleId}[]}
 */
export function parseRedirectRows(source) {
	const rows = [];
	for (const block of source.match(/\{[^{}]*fromSlug:[^{}]*\}/g) ?? []) {
		const get = (n) => (FIELD(n).exec(block) ?? [])[1];
		const row = Object.fromEntries(ROW_FIELDS.map((n) => [n, get(n)]));
		// The interface declares the fields with types, not quoted values.
		if (ROW_FIELDS.slice(0, 5).every((n) => row[n] !== undefined)) {
			rows.push({ ...row, moduleId: row.moduleId ?? null });
		}
	}
	return rows;
}

/** @returns {Map<string, {chapter: string, slug: string}[]>} module id → pages */
export function pagesByModule(bookDir) {
	const out = new Map();
	const chapters = join(bookDir, 'chapters');
	if (!existsSync(chapters)) return out;
	for (const chapter of readdirSync(chapters)) {
		const dir = join(chapters, chapter);
		if (!statSync(dir).isDirectory()) continue;
		for (const file of readdirSync(dir)) {
			if (!file.endsWith('.html')) continue;
			const m = MODULE_ID.exec(readFileSync(join(dir, file), 'utf8'));
			if (!m) continue;
			const list = out.get(m[1]) ?? [];
			list.push({ chapter, slug: file.replace(/\.html$/, '') });
			out.set(m[1], list);
		}
	}
	return out;
}

/** @returns {Set<string>} "chapter/slug" of every module page in the tree */
export function pageSet(byModule) {
	return new Set([...byModule.values()].flat().map((p) => pageKey(p.chapter, p.slug)));
}

/**
 * Every page of `before` that `after` lacks, as a rename or a deletion.
 * A rename's `status`:
 *   - 'covered': a row sends the old page to the new one;
 *   - 'missing': no row for the old page;
 *   - 'wrong-target': the old page's row points elsewhere (the route takes the
 *     first row for a page, so a second row would never be read);
 *   - 'appendix': an appendix that keeps its letter, so its address;
 *   - 'appendix-moved': an appendix whose letter changes, or a page moving in
 *     or out of the appendices: no redirect exists for /vidauki/;
 *   - 'ambiguous': the module has more than one page in `after`, so there is
 *     no basis to choose a target (fix it at the source in efni).
 * @param {Map} before
 * @param {Map} after
 * @param {{bookSlug, fromChapter, fromSlug, toChapter, toSlug, moduleId}[]} rows
 * @param {string} bookSlug
 */
export function compareTrees(before, after, rows, bookSlug) {
	const renames = [];
	const deletions = [];
	for (const [moduleId, oldPages] of before) {
		const newPages = after.get(moduleId) ?? [];
		for (const from of oldPages) {
			if (newPages.some((p) => p.chapter === from.chapter && p.slug === from.slug)) continue;
			if (newPages.length === 0) {
				deletions.push({ moduleId, ...from });
				continue;
			}
			if (newPages.length > 1) {
				renames.push({ moduleId, from, to: null, candidates: newPages, status: 'ambiguous', ok: false });
				continue;
			}
			const to = newPages[0];
			if (from.chapter === APPENDICES || to.chapter === APPENDICES) {
				const letter = appendixLetter(from.slug);
				const kept =
					from.chapter === to.chapter && letter !== null && letter === appendixLetter(to.slug);
				renames.push({ moduleId, from, to, letter, status: kept ? 'appendix' : 'appendix-moved', ok: kept });
				continue;
			}
			const existing = rows.find(
				(r) => r.bookSlug === bookSlug && r.fromChapter === from.chapter && r.fromSlug === from.slug
			);
			const status = !existing
				? 'missing'
				: existing.toChapter === to.chapter && existing.toSlug === to.slug
					? 'covered'
					: 'wrong-target';
			renames.push({ moduleId, from, to, existing, status, ok: status === 'covered' });
		}
	}
	return { renames, deletions };
}

/**
 * Every row of the book whose target is not a page of `after`. Its `status`:
 *   - 'stale': the old page is gone too, so its address would 404; `to` is
 *     the row's module's one page in `after`, the new target;
 *   - 'stale-gone' / 'stale-ambiguous': the same, with no page or several for
 *     the module (or a row with no moduleId), so no target to suggest;
 *   - 'inert': the old page is published, so the row does nothing (the route
 *     redirects only to a published target). Not a stop.
 * @param {{bookSlug, fromChapter, fromSlug, toChapter, toSlug, moduleId}[]} rows
 * @param {Map} after
 * @param {string} bookSlug
 */
export function staleRows(rows, after, bookSlug) {
	const live = pageSet(after);
	const out = [];
	for (const row of rows) {
		if (row.bookSlug !== bookSlug) continue;
		if (live.has(pageKey(row.toChapter, row.toSlug))) continue;
		if (live.has(pageKey(row.fromChapter, row.fromSlug))) {
			out.push({ row, status: 'inert', ok: true });
			continue;
		}
		const pages = row.moduleId ? (after.get(row.moduleId) ?? []) : [];
		if (pages.length === 1) out.push({ row, status: 'stale', to: pages[0], ok: false });
		else out.push({ row, status: pages.length ? 'stale-ambiguous' : 'stale-gone', candidates: pages, ok: false });
	}
	return out;
}

/**
 * The rows to write: `add` for renames with no row, `change` for a row to
 * replace (its rename points elsewhere, or it is stale), each with the row it
 * replaces. One row per old page, in chapter and section order.
 */
export function rowsToWrite(bookSlug, renames, stale) {
	const byFrom = new Map();
	const put = (from, to, moduleId, replaces) => {
		const row = {
			bookSlug,
			fromChapter: from.chapter,
			fromSlug: from.slug,
			toChapter: to.chapter,
			toSlug: to.slug,
			moduleId
		};
		const key = pageKey(from.chapter, from.slug);
		if (!byFrom.has(key)) byFrom.set(key, { row, replaces });
	};
	for (const r of renames) {
		if (r.status === 'missing') put(r.from, r.to, r.moduleId, null);
		if (r.status === 'wrong-target') put(r.from, r.to, r.moduleId, r.existing);
	}
	for (const s of stale) {
		if (s.status !== 'stale') continue;
		put({ chapter: s.row.fromChapter, slug: s.row.fromSlug }, s.to, s.row.moduleId, s.row);
	}
	const sorted = [...byFrom.entries()].sort(([a], [b]) => naturalOrder(a, b)).map(([, v]) => v);
	return {
		add: sorted.filter((x) => !x.replaces).map((x) => x.row),
		change: sorted.filter((x) => x.replaces)
	};
}

/** One row in sectionRedirects.ts's own layout. */
export function formatRow(row) {
	const quote = (v) => `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
	const fields = ROW_FIELDS.map((n) => `\t\t${n}: ${quote(row[n])}`).join(',\n');
	return `\t{\n${fields}\n\t},`;
}

function describeRename(r) {
	const from = pageKey(r.from.chapter, r.from.slug);
	if (r.status === 'ambiguous') {
		const pages = r.candidates.map((p) => pageKey(p.chapter, p.slug)).join(', ');
		return `STOP rename ${r.moduleId}: ${from} -> ${r.candidates.length} pages (${pages})  (one module, two pages: fix at the source in efni)`;
	}
	const head = `rename ${r.moduleId}: ${from} -> ${pageKey(r.to.chapter, r.to.slug)}`;
	switch (r.status) {
		case 'covered':
			return `ok   ${head}`;
		case 'appendix':
			return `ok   ${head}  (appendix ${r.letter}: its address stays)`;
		case 'appendix-moved':
			return `STOP ${head}  (an appendix's letter changes: no redirect exists for /vidauki/)`;
		case 'wrong-target':
			return `STOP ${head}  (its row points at ${pageKey(r.existing.toChapter, r.existing.toSlug)})`;
		default:
			return `STOP ${head}  (no redirect row)`;
	}
}

function describeStale(s) {
	const r = s.row;
	const head = `row ${pageKey(r.fromChapter, r.fromSlug)} -> ${pageKey(r.toChapter, r.toSlug)}`;
	switch (s.status) {
		case 'inert':
			return `note inert ${head}: its old page is published, so the row does nothing`;
		case 'stale':
			return `STOP stale ${head}: the target is not in the new tree; ${r.moduleId} is now ${pageKey(s.to.chapter, s.to.slug)}`;
		case 'stale-ambiguous':
			return `STOP stale ${head}: the target is not in the new tree, and ${r.moduleId} has ${s.candidates.length} pages there`;
		default:
			return `STOP stale ${head}: the target is not in the new tree, and ${r.moduleId ?? 'the row (no moduleId)'} has no page there, so the old address will 404`;
	}
}

function usage(message) {
	if (message) console.error(message);
	console.error(
		'Usage: node scripts/check-content-renames.js [--book <slug>] [--redirects <file>] <before-book-dir> <after-book-dir>'
	);
	process.exitCode = 2;
}

function main() {
	let parsed;
	try {
		parsed = parseArgs({
			options: { book: { type: 'string' }, redirects: { type: 'string' } },
			allowPositionals: true
		});
	} catch (e) {
		return usage(e.message);
	}
	const [beforeDir, afterDir] = parsed.positionals;
	if (!beforeDir || !afterDir || parsed.positionals.length > 2) return usage();
	const bookSlug = parsed.values.book ?? basename(resolve(afterDir));
	if (!KNOWN_BOOKS.includes(bookSlug)) {
		return usage(`Unknown book "${bookSlug}": pass --book <slug> (${KNOWN_BOOKS.join(', ')})`);
	}
	const root = join(dirname(fileURLToPath(import.meta.url)), '..');
	const redirectsFile = parsed.values.redirects ?? join(root, REDIRECTS_PATH);
	if (!existsSync(redirectsFile)) return usage(`No such redirects file: ${redirectsFile}`);
	const rows = parseRedirectRows(readFileSync(redirectsFile, 'utf8'));
	const before = pagesByModule(beforeDir);
	const after = pagesByModule(afterDir);
	if (before.size === 0 || after.size === 0) {
		console.error(`STOP: no pages found (before ${before.size} modules, after ${after.size})`);
		process.exitCode = 1;
		return;
	}
	const { renames, deletions } = compareTrees(before, after, rows, bookSlug);
	const stale = staleRows(rows, after, bookSlug);
	for (const r of renames) console.log(describeRename(r));
	for (const d of deletions) console.log(`STOP deleted ${d.moduleId}: ${pageKey(d.chapter, d.slug)}`);
	for (const s of stale) console.log(describeStale(s));

	const bookRows = rows.filter((r) => r.bookSlug === bookSlug).length;
	const staleCount = stale.filter((s) => !s.ok).length;
	const bad = renames.filter((r) => !r.ok).length + deletions.length + staleCount;
	console.log(
		`${before.size} modules before, ${after.size} after; ${renames.length} renamed, ${deletions.length} deleted; ${bookRows} rows checked, ${staleCount} stale; ${bad === 0 ? 'every removed page has its redirect' : `${bad} STOP`}`
	);

	const { add, change } = rowsToWrite(bookSlug, renames, stale);
	if (add.length) {
		console.log(`\nRows to add to ${REDIRECTS_PATH} (${add.length}):`);
		for (const row of add) console.log(formatRow(row));
	}
	if (change.length) {
		console.log(`\nRows to replace in ${REDIRECTS_PATH} (${change.length}), each the row with the same fromChapter and fromSlug:`);
		for (const { row, replaces } of change) {
			console.log(`\t// was -> ${pageKey(replaces.toChapter, replaces.toSlug)}`);
			console.log(formatRow(row));
		}
	}
	process.exitCode = bad === 0 ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
