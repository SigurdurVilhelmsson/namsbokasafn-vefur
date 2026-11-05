#!/usr/bin/env node
/**
 * check-content-renames.js — before a content deploy, find every published page
 * the sync removed, and say whether a redirect covers it.
 *
 * A section's file name comes from its title, so a re-render that corrects a
 * title renames the page and retires its URL. efni's slug map cannot see
 * renames from before its prune-on-rename, so this compares the two trees
 * themselves, paired on `data-module-id` (CLAUDE.md, "A rename retires a reader
 * URL"):
 *   - same module, new file name: a RENAME, which needs a row in
 *     `src/lib/data/sectionRedirects.ts` with that from and to;
 *   - module gone: a DELETION, which is a stop unless it was expected.
 *
 * Usage:
 *   node scripts/check-content-renames.js <before-book-dir> <after-book-dir>
 *   e.g. a copy of static/content/efnafraedi-2e taken before the sync, and
 *   static/content/efnafraedi-2e after it.
 *
 * Exit 0 when every removed page is a rename with its redirect row; 1 otherwise;
 * 2 on a usage error. Read-only.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MODULE_ID = /data-module-id="([^"]+)"/;
const REDIRECTS_PATH = 'src/lib/data/sectionRedirects.ts';
const FIELD = (name) => new RegExp(`\\b${name}:\\s*'([^']*)'`);

/**
 * The rows of sectionRedirects.ts, read as text: each `{ … }` holding a
 * fromSlug. Fields are read one by one, so their order does not matter.
 * @returns {{bookSlug, fromChapter, fromSlug, toChapter, toSlug}[]}
 */
export function parseRedirectRows(source) {
	const rows = [];
	for (const block of source.match(/\{[^{}]*fromSlug:[^{}]*\}/g) ?? []) {
		const get = (n) => (FIELD(n).exec(block) ?? [])[1];
		const row = {
			bookSlug: get('bookSlug'),
			fromChapter: get('fromChapter'),
			fromSlug: get('fromSlug'),
			toChapter: get('toChapter'),
			toSlug: get('toSlug')
		};
		// The interface declares the fields with types, not quoted values.
		if (Object.values(row).every((v) => v !== undefined)) rows.push(row);
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

/**
 * @param {Map} before
 * @param {Map} after
 * @param {{bookSlug, fromChapter, fromSlug, toChapter, toSlug}[]} rows
 * @param {string} bookSlug
 * @returns {{renames: object[], deletions: object[]}}
 */
export function compareTrees(before, after, rows, bookSlug) {
	const renames = [];
	const deletions = [];
	for (const [moduleId, oldPages] of before) {
		const newPages = after.get(moduleId) ?? [];
		for (const old of oldPages) {
			if (newPages.some((p) => p.chapter === old.chapter && p.slug === old.slug)) continue;
			if (newPages.length === 0) {
				deletions.push({ moduleId, ...old });
				continue;
			}
			const to = newPages[0];
			const covered = rows.some(
				(r) =>
					r.bookSlug === bookSlug &&
					r.fromChapter === old.chapter &&
					r.fromSlug === old.slug &&
					r.toChapter === to.chapter &&
					r.toSlug === to.slug
			);
			renames.push({ moduleId, from: old, to, covered });
		}
	}
	return { renames, deletions };
}

function main() {
	const [beforeDir, afterDir] = process.argv.slice(2);
	if (!beforeDir || !afterDir) {
		console.error('Usage: node scripts/check-content-renames.js <before-book-dir> <after-book-dir>');
		process.exitCode = 2;
		return;
	}
	const root = join(dirname(fileURLToPath(import.meta.url)), '..');
	const rows = parseRedirectRows(readFileSync(join(root, REDIRECTS_PATH), 'utf8'));
	const bookSlug = basename(resolve(afterDir));
	const before = pagesByModule(beforeDir);
	const after = pagesByModule(afterDir);
	if (before.size === 0 || after.size === 0) {
		console.error(`STOP: no pages found (before ${before.size} modules, after ${after.size})`);
		process.exitCode = 1;
		return;
	}
	const { renames, deletions } = compareTrees(before, after, rows, bookSlug);
	for (const r of renames) {
		console.log(
			`${r.covered ? 'ok  ' : 'STOP'} rename ${r.moduleId}: ${r.from.chapter}/${r.from.slug} -> ${r.to.chapter}/${r.to.slug}${r.covered ? '' : '  (no redirect row)'}`
		);
	}
	for (const d of deletions) console.log(`STOP deleted ${d.moduleId}: ${d.chapter}/${d.slug}`);
	const bad = renames.filter((r) => !r.covered).length + deletions.length;
	console.log(
		`${before.size} modules before, ${after.size} after; ${renames.length} renamed, ${deletions.length} deleted; ${bad === 0 ? 'every removed page has its redirect' : `${bad} STOP`}`
	);
	process.exitCode = bad === 0 ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
