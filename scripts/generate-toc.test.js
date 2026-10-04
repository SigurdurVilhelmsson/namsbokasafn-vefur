import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { resolve } from 'path';
import { appendixLetter, usablePages, unresolvedDuplicates } from './generate-toc.js';
import { resetIdentityCache } from './lib/overlay.js';

let root;

beforeEach(() => {
	root = mkdtempSync(resolve(tmpdir(), 'generate-toc-'));
	unresolvedDuplicates.length = 0;
	resetIdentityCache();
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
	unresolvedDuplicates.length = 0;
	resetIdentityCache();
	vi.restoreAllMocks();
});

function writeModule(dir, filename, moduleId) {
	mkdirSync(dir, { recursive: true });
	writeFileSync(
		resolve(dir, filename),
		`<article class="cnx-module" data-module-id="${moduleId}"><h1 id="title">T</h1></article>`
	);
}

/** A synced destination dir plus the matching faithful source dir. */
function tracks(dirName) {
	const dest = resolve(root, 'dest', 'chapters', dirName);
	const efniPath = resolve(root, 'efni');
	const faithful = resolve(efniPath, 'books', 'liffraedi-2e', '05-publication', 'faithful', 'chapters', dirName);
	return { dest, faithful, options: { efniPath } };
}

describe('usablePages', () => {
	it('drops the baseline page a reviewed rename superseded', () => {
		const { dest, faithful, options } = tracks('03');
		writeModule(dest, '3-3-fitusyrur.html', 'm66441');
		writeModule(dest, '3-3-lipid.html', 'm66441');
		writeModule(faithful, '3-3-lipid.html', 'm66441');

		expect(usablePages(dest, 'liffraedi-2e', '03', options)).toEqual(['3-3-lipid.html']);
	});

	it('records no unresolved duplicate when the rename is resolved', () => {
		const { dest, faithful, options } = tracks('03');
		writeModule(dest, '3-3-fitusyrur.html', 'm66441');
		writeModule(dest, '3-3-lipid.html', 'm66441');
		writeModule(faithful, '3-3-lipid.html', 'm66441');

		usablePages(dest, 'liffraedi-2e', '03', options);
		expect(unresolvedDuplicates).toEqual([]);
	});

	it('keeps both pages when no reviewed version can choose', () => {
		const { dest, options } = tracks('10');
		writeModule(dest, '10-5-fast-astand-efnis.html', 'm68770');
		writeModule(dest, '10-5-fastur-efnishamur.html', 'm68770');

		expect(usablePages(dest, 'liffraedi-2e', '10', options).sort()).toEqual([
			'10-5-fast-astand-efnis.html',
			'10-5-fastur-efnishamur.html'
		]);
	});

	it('records the unresolved duplicate for the end-of-run summary', () => {
		const { dest, options } = tracks('10');
		writeModule(dest, '10-5-fast-astand-efnis.html', 'm68770');
		writeModule(dest, '10-5-fastur-efnishamur.html', 'm68770');

		usablePages(dest, 'liffraedi-2e', '10', options);
		expect(unresolvedDuplicates).toEqual([
			{
				bookSlug: 'liffraedi-2e',
				dirName: '10',
				identity: 'module:m68770',
				files: ['10-5-fast-astand-efnis.html', '10-5-fastur-efnishamur.html']
			}
		]);
	});

	it('returns every page in a directory without duplicates', () => {
		const { dest, options } = tracks('03');
		writeModule(dest, '3-3-lipid.html', 'm66441');
		writeModule(dest, '3-4-protin.html', 'm66442');

		expect(usablePages(dest, 'liffraedi-2e', '03', options).sort()).toEqual([
			'3-3-lipid.html',
			'3-4-protin.html'
		]);
	});

	it('ignores non-html files', () => {
		const { dest, options } = tracks('03');
		writeModule(dest, '3-3-lipid.html', 'm66441');
		writeFileSync(resolve(dest, 'toc.json'), '{}');

		expect(usablePages(dest, 'liffraedi-2e', '03', options)).toEqual(['3-3-lipid.html']);
	});
});

describe('appendixLetter', () => {
	it('reads the numbered form efni renders: appendices-N- is the Nth letter', () => {
		expect(appendixLetter('appendices-1-lotukerfid')).toBe('A');
		expect(appendixLetter('appendices-13-standard-electrode-potentials')).toBe('M');
	});

	// The cap was 13 (A-M), Chemistry 2e's count: a 14th appendix in any book
	// was dropped from the TOC with only a warning
	it('reads appendices past M, up to Z', () => {
		expect(appendixLetter('appendices-14-x')).toBe('N');
		expect(appendixLetter('appendices-26-x')).toBe('Z');
		expect(appendixLetter('99-14-x')).toBe('N');
		expect(appendixLetter('N-extra-tables')).toBe('N');
	});

	it('reads a letter prefix in either case', () => {
		expect(appendixLetter('a-periodic-table')).toBe('A');
	});

	it('returns null for anything else', () => {
		expect(appendixLetter('appendices-0-x')).toBeNull();
		expect(appendixLetter('appendices-27-x')).toBeNull();
		expect(appendixLetter('1-1-chapter-section')).toBeNull();
	});
});
