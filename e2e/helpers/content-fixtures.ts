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
 * across runs and machines.
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
		.filter((slug) => readToc(slug) !== null)
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
