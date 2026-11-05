import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { pagesByModule, compareTrees, parseRedirectRows } from './check-content-renames.js';

const ROWS = `
export interface SectionRedirect { bookSlug: string; fromSlug: string; }
export const SECTION_REDIRECTS = [
	{
		bookSlug: 'bok',
		fromChapter: '01',
		fromSlug: '1-1-gamalt',
		toChapter: '01',
		toSlug: '1-1-nytt',
		moduleId: 'm1'
	}
];`;

function page(root, chapter, slug, moduleId) {
	mkdirSync(join(root, 'chapters', chapter), { recursive: true });
	writeFileSync(
		join(root, 'chapters', chapter, `${slug}.html`),
		`<article class="cnx-module" data-module-id="${moduleId}"></article>`
	);
}

describe('check-content-renames', () => {
	let dir, before, after;
	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'renames-'));
		before = join(dir, 'before');
		after = join(dir, 'bok');
	});
	afterEach(() => rmSync(dir, { recursive: true, force: true }));

	it('reads the redirect rows and skips the interface', () => {
		expect(parseRedirectRows(ROWS)).toEqual([
			{ bookSlug: 'bok', fromChapter: '01', fromSlug: '1-1-gamalt', toChapter: '01', toSlug: '1-1-nytt' }
		]);
	});

	it('passes a rename with its row and an unchanged page', () => {
		page(before, '01', '1-1-gamalt', 'm1');
		page(before, '01', '1-2-sama', 'm2');
		page(after, '01', '1-1-nytt', 'm1');
		page(after, '01', '1-2-sama', 'm2');
		const r = compareTrees(pagesByModule(before), pagesByModule(after), parseRedirectRows(ROWS), 'bok');
		expect(r.deletions).toEqual([]);
		expect(r.renames).toHaveLength(1);
		expect(r.renames[0].covered).toBe(true);
	});

	it('flags a rename with no row, a row for another book, and a deleted module', () => {
		page(before, '01', '1-3-gamalt', 'm3');
		page(before, '01', '1-4-farid', 'm4');
		page(after, '01', '1-3-nytt', 'm3');
		const r = compareTrees(pagesByModule(before), pagesByModule(after), parseRedirectRows(ROWS), 'bok');
		expect(r.renames.map((x) => x.covered)).toEqual([false]);
		expect(r.deletions).toEqual([{ moduleId: 'm4', chapter: '01', slug: '1-4-farid' }]);

		page(before, '01', '1-1-gamalt', 'm1');
		page(after, '01', '1-1-nytt', 'm1');
		const other = compareTrees(pagesByModule(before), pagesByModule(after), parseRedirectRows(ROWS), 'annad');
		expect(other.renames.find((x) => x.moduleId === 'm1').covered).toBe(false);
	});

	it('the CLI exits 1 on a STOP and 2 without arguments', () => {
		page(before, '01', '1-4-farid', 'm4');
		page(after, '01', '1-5-annad', 'm5');
		const cli = (args) => spawnSync(process.execPath, ['scripts/check-content-renames.js', ...args], { encoding: 'utf8' });
		const stop = cli([before, after]);
		expect(stop.status).toBe(1);
		expect(stop.stdout).toContain('STOP deleted m4: 01/1-4-farid');
		expect(cli([]).status).toBe(2);
	});

	it('reads the real redirect file', () => {
		const rows = parseRedirectRows(readFileSync('src/lib/data/sectionRedirects.ts', 'utf8'));
		expect(rows.length).toBeGreaterThan(0);
		expect(rows.every((r) => r.fromSlug && r.toSlug && r.bookSlug)).toBe(true);
	});
});
