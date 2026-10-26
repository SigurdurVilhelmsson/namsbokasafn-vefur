// @vitest-environment node
/**
 * D03's data rule (CLAUDE.md, "Notes for Code Reviewers"): the only data the
 * reader sends to another server is GoatCounter's cookieless page count.
 *
 * Until plan step S3.3 a production build sent a page-view event by sendBeacon
 * to the editorial server (src/lib/utils/api.ts, built with VITE_API_URL). This
 * guard fails if any of that comes back: a beacon, the editorial host, its
 * analytics endpoint or the env variable that pointed at it, and also the other
 * ways a page sends data without waiting for an answer (a keepalive fetch, an
 * XMLHttpRequest) or reads a public env variable through SvelteKit. None of
 * these appears in src or static today. A new way to send data needs a new
 * decision first, not an exception here.
 *
 * It reads the source only. S3.3's request log of a production-env build is the
 * runtime check, and a page that loads a third-party script would not show here.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));

// static/content and static/provenance are synced book content (gitignored).
const SKIPPED = ['static/content', 'static/provenance'];

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (SKIPPED.includes(relative(ROOT, path))) return [];
		return statSync(path).isDirectory() ? walk(path) : [path];
	});
}

export const SENDS_DATA =
	/sendBeacon|VITE_API_URL|ritstjorn\.namsbokasafn\.is|\/api\/analytics|\bapiUrl\(|keepalive|XMLHttpRequest|\$env\/(static|dynamic)\/public/;

const FILES = [...walk(join(ROOT, 'src')), ...walk(join(ROOT, 'static'))].filter(
	(path) => /\.(svelte|ts|js|html|css)$/.test(path) && !/\.test\.ts$/.test(path)
);

describe('the data rule (D03)', () => {
	it('reads the app code it guards', () => {
		const names = FILES.map((path) => relative(ROOT, path));
		expect(names).toContain('src/routes/[bookSlug]/+layout.svelte');
		expect(names).toContain('src/app.html');
		expect(names).toContain('static/sw-offline-book.js');
	});

	// Control: the pattern catches what S3.3 removed.
	it.each([
		"navigator.sendBeacon(url, blob)",
		"import.meta.env.VITE_API_URL",
		"var l='https://ritstjorn.namsbokasafn.is'",
		"apiUrl('/api/analytics/event')",
		'fetch(url, { method: "POST", body, keepalive: true })',
		'const xhr = new XMLHttpRequest()',
		"import { PUBLIC_STATS_URL } from '$env/static/public'"
	])('the pattern matches %s', (line) => {
		expect(SENDS_DATA.test(line)).toBe(true);
	});

	it('no app file sends anything to the editorial server', () => {
		const hits = FILES.filter((path) => SENDS_DATA.test(readFileSync(path, 'utf8'))).map((path) => relative(ROOT, path));
		expect(hits).toEqual([]);
	});
});
