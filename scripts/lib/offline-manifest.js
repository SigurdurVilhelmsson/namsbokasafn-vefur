/**
 * The offline manifest of a book: every file a reader can open offline, with its
 * disk size and a content hash. Written by process-content.js to
 * `static/content/<book>/offline-manifest.json`, summarised in `toc.offline`.
 *
 * The reader's "download for offline" fetches exactly this list, shows its total
 * as the download size, and on an update fetches only the files whose hash changed.
 *
 * File set (the e2e helper `offlineFileSet` derives the same set independently):
 *  - every `.html` under `chapters/` — sections, front matter (00/), appendices and
 *    chapter rollups such as answer keys;
 *  - `glossary.json` and `index.json` when present;
 *  - every LOCAL image those pages reference with `<img src>`, once. Image files no
 *    page references are left out: chemistry has 2,223 image files on disk and
 *    references 1,147, so walking the folder would double the download.
 *
 * `toc.json` is not listed: it carries the version and is fetched last by the
 * download itself.
 */

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

// `\s` before `src`, so `data-src="..."` is never read as the src.
const IMG_SRC = /<img\b[^>]*?\ssrc=["']([^"']+)["']/g;
const IMG_TAG = /<img\b[^>]*>/gi;

function walk(dir) {
	if (!existsSync(dir)) return [];
	return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
		e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]
	);
}

const shortHash = (data) => createHash('sha256').update(data).digest('hex').slice(0, 16);

/**
 * @param {string} staticDir  the directory served at `/` (holds `content/`)
 * @param {string} bookSlug
 * @returns {{ version: string, bytes: number,
 *   files: { p: string, b: number, h: string }[], missing: string[], unparsed: string[] }}
 *   `p` is the URL path, `b` disk bytes, `h` a 16-hex sha256 prefix; `missing` lists
 *   `<img>` targets that do not exist on disk (reported, not downloaded);
 *   `unparsed` lists `<img>` tags with no src this parser can read (srcset only,
 *   unquoted src...), so a markup change upstream cannot silently drop figures
 *   from the download.
 */
export function buildOfflineManifest(staticDir, bookSlug) {
	const bookDir = join(staticDir, 'content', bookSlug);
	const pages = walk(join(bookDir, 'chapters')).filter((f) => f.endsWith('.html'));
	const json = ['glossary.json', 'index.json'].map((f) => join(bookDir, f)).filter(existsSync);

	const images = new Set();
	const missing = [];
	const unparsed = [];
	for (const page of pages) {
		const html = readFileSync(page, 'utf-8');
		for (const [tag] of html.matchAll(IMG_TAG)) {
			// An explicit empty src (a video placeholder in physics) is deliberate, not a
			// figure. A srcset lets the browser pick a file the download never stored.
			if (!/\ssrc=["'][^"']*["']/.test(tag) || /\ssrcset=/i.test(tag)) {
				unparsed.push(`${relative(staticDir, page)}: ${tag.slice(0, 80)}`);
			}
		}
		for (const [tag] of html.matchAll(/<source\b[^>]*>/gi)) {
			unparsed.push(`${relative(staticDir, page)}: ${tag.slice(0, 80)}`);
		}
		for (const [, src] of html.matchAll(IMG_SRC)) {
			if (/^(?:[a-z]+:|\/\/)/i.test(src)) continue; // external or data: — not ours to store
			const abs = src.startsWith('/') ? join(staticDir, src) : join(dirname(page), src);
			if (existsSync(abs)) images.add(abs);
			else missing.push(src);
		}
	}

	const files = [...pages, ...json, ...images]
		.map((abs) => {
			const data = readFileSync(abs);
			return {
				p: '/' + relative(staticDir, abs).split(sep).join('/'),
				b: data.length,
				h: shortHash(data)
			};
		})
		.sort((a, b) => (a.p < b.p ? -1 : a.p > b.p ? 1 : 0));

	return {
		version: shortHash(files.map((f) => `${f.p} ${f.h}`).join('\n')).slice(0, 12),
		bytes: files.reduce((sum, f) => sum + f.b, 0),
		files,
		missing,
		unparsed
	};
}
