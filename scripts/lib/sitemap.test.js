import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { sitemapUrls } from './sitemap.js';

const BASE = 'https://namsbokasafn.is';

function writeToc(root, slug) {
	mkdirSync(join(root, slug), { recursive: true });
	const toc = {
		chapters: [{ number: 3, sections: [{ file: '3-1-inngangur.html' }] }]
	};
	writeFileSync(join(root, slug, 'toc.json'), JSON.stringify(toc));
}

describe('sitemapUrls', () => {
	let root;

	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), 'vefur-sitemap-'));
		for (const slug of ['efnafraedi-2e', 'lifraen-efnafraedi', 'liffraedi-2e']) writeToc(root, slug);
	});

	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	// The generator reads the CONTENT DIRECTORY, not the book registry, and a
	// dev machine's static/content still holds the retired book. Taking it out
	// of book.ts alone would leave every one of its URLs in the sitemap.
	it('leaves out a retired book that is still in the content directory', () => {
		expect(sitemapUrls(root).filter((url) => url.includes('lifraen-efnafraedi'))).toEqual([]);
	});

	it('lists a published book', () => {
		expect(sitemapUrls(root)).toContain(`${BASE}/efnafraedi-2e/kafli/03/3-1-inngangur`);
	});

	// The three books paused on 2026-08-22 are out of scope for the 2026-09-23
	// ruling: they stay live, and a build from a checkout that has them lists them.
	it('still lists a paused book', () => {
		expect(sitemapUrls(root)).toContain(`${BASE}/liffraedi-2e/kafli/03/3-1-inngangur`);
	});

	it('skips a directory with no toc.json', () => {
		mkdirSync(join(root, 'stjornufraedi'));
		expect(sitemapUrls(root).filter((url) => url.includes('stjornufraedi'))).toEqual([]);
	});
});
