/**
 * Pick gating-test fixtures from the SYNCED CONTENT rather than hardcoding slugs.
 *
 * Why: the gating specs assert that a capability's sidebar link appears for a book
 * that has it and is absent for a book that does not. Hardcoding "book X has no
 * index" bakes in a fact about the sister repo's content that goes stale the moment
 * that book gains one — and then the spec fails while the app is correct.
 *
 * That is not hypothetical. `index-gating.spec.ts` hardcoded edlisfraedi-2e as the
 * no-index book; efni later shipped a physics index (its GI-1 work), and both index
 * tests went red in CI with the app behaving exactly as designed.
 * `glossary-gating.spec.ts` carried the same trap for orverufraedi's glossary.
 *
 * Content lives in `static/content/<slug>/toc.json`, which is gitignored and synced
 * from namsbokasafn-efni at build time, so the answer must be read at run time.
 *
 * Paths resolve against `import.meta.url`, never `process.cwd()` — the same rule the
 * rest of the project follows, so this keeps working regardless of where the runner
 * is invoked from.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { isRetired } from '../../scripts/lib/published-books.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(HERE, '..', '..', 'static', 'content');

/** A capability gated by a key on toc.json. */
export type Capability = 'index' | 'glossary';

interface Toc {
	index?: unknown;
	glossary?: unknown;
}

function readToc(slug: string): Toc | null {
	const file = join(CONTENT_DIR, slug, 'toc.json');
	if (!existsSync(file)) return null;
	try {
		return JSON.parse(readFileSync(file, 'utf-8')) as Toc;
	} catch {
		return null;
	}
}

/**
 * Book slugs with a readable toc.json, sorted so fixture choice is deterministic
 * across runs and machines. A retired book is skipped: a dev machine's
 * static/content keeps it after retirement (CI never syncs it), and the app
 * answers 404 for it, so picking it fails every gating test on that machine.
 *
 * Throws when no content is present at all: that means the sync step did not run,
 * which is a broken test setup and must fail loudly rather than silently skipping
 * every gating test into a green build.
 */
export function syncedBooks(): string[] {
	if (!existsSync(CONTENT_DIR)) {
		throw new Error(
			`No synced content at ${CONTENT_DIR}. Run: node scripts/sync-content.js --source ../namsbokasafn-efni`
		);
	}
	const slugs = readdirSync(CONTENT_DIR, { withFileTypes: true })
		.filter((e) => e.isDirectory())
		.map((e) => e.name)
		.filter((slug) => !isRetired(slug) && readToc(slug) !== null)
		.sort();

	if (slugs.length === 0) {
		throw new Error(
			`No book has a readable toc.json under ${CONTENT_DIR}. Content sync appears incomplete.`
		);
	}
	return slugs;
}

/** First synced book that HAS the capability, or null if none does. */
export function bookWith(capability: Capability): string | null {
	return syncedBooks().find((slug) => readToc(slug)?.[capability] != null) ?? null;
}

/** First synced book that LACKS the capability, or null if every book has it. */
export function bookWithout(capability: Capability): string | null {
	return syncedBooks().find((slug) => readToc(slug)?.[capability] == null) ?? null;
}

/**
 * Reader URLs of the section pages whose published HTML contains `marker` most
 * often, across every synced book (editor artifacts such as `*.html.backup.*`
 * are skipped): the pages most likely to exercise markup a
 * test is about, picked from the content rather than from a hardcoded slug (a
 * title correction renames the file, and with it the URL). Ties break on the
 * URL, so the choice is deterministic.
 */
export function sectionsContaining(marker: string, limit: number): string[] {
	const found: { url: string; count: number }[] = [];
	for (const slug of syncedBooks()) {
		const chaptersDir = join(CONTENT_DIR, slug, 'chapters');
		if (!existsSync(chaptersDir)) continue;
		for (const chapter of readdirSync(chaptersDir, { withFileTypes: true })) {
			// Numbered chapters only: front matter (00) and appendices route elsewhere.
			if (!chapter.isDirectory() || !/^\d+$/.test(chapter.name) || chapter.name === '00') continue;
			for (const file of readdirSync(join(chaptersDir, chapter.name))) {
				// Module sections only ("1-4-maelingar.html"): rollups route elsewhere.
				if (!/^\d+-\d+-.+\.html$/.test(file)) continue;
				const html = readFileSync(join(chaptersDir, chapter.name, file), 'utf-8');
				const count = html.split(marker).length - 1;
				if (count > 0) {
					found.push({ url: `/${slug}/kafli/${chapter.name}/${file.slice(0, -5)}/`, count });
				}
			}
		}
	}
	return found
		.sort((a, b) => b.count - a.count || a.url.localeCompare(b.url))
		.slice(0, limit)
		.map((f) => f.url);
}

/** First synced book whose toc.json lists front matter (chapters/00), or null. */
export function bookWithFrontMatter(): string | null {
	return (
		syncedBooks().find((slug) => {
			const toc = readToc(slug) as { frontMatter?: unknown[] } | null;
			return (toc?.frontMatter?.length ?? 0) > 0;
		}) ?? null
	);
}
