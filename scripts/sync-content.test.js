import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, chmodSync } from 'fs';
import { tmpdir } from 'os';
import { resolve } from 'path';
import { pruneSupersededFiles, selectBooks, tocRegenArgs } from './sync-content.js';
import { resetIdentityCache } from './lib/overlay.js';

let root;

beforeEach(() => {
	root = mkdtempSync(resolve(tmpdir(), 'sync-content-'));
	resetIdentityCache();
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
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

describe('pruneSupersededFiles', () => {
	it('deletes the baseline page a reviewed rename replaced', () => {
		const dest = resolve(root, 'dest');
		const faithful = resolve(root, 'faithful');
		writeModule(resolve(dest, 'chapters', '03'), '3-3-fitusyrur.html', 'm66441');
		writeModule(resolve(dest, 'chapters', '03'), '3-3-lipid.html', 'm66441');
		writeModule(resolve(faithful, 'chapters', '03'), '3-3-lipid.html', 'm66441');

		expect(pruneSupersededFiles(dest, faithful, 'liffraedi-2e')).toBe(0);
		expect(existsSync(resolve(dest, 'chapters', '03', '3-3-fitusyrur.html'))).toBe(false);
		expect(existsSync(resolve(dest, 'chapters', '03', '3-3-lipid.html'))).toBe(true);
	});

	it('prunes front matter and appendix directories too', () => {
		const dest = resolve(root, 'dest');
		const faithful = resolve(root, 'faithful');
		writeModule(resolve(dest, 'chapters', '00'), '0-1-formali.html', 'm68662');
		writeModule(resolve(dest, 'chapters', '00'), '0-1-inngangsordi.html', 'm68662');
		writeModule(resolve(faithful, 'chapters', '00'), '0-1-formali.html', 'm68662');
		writeModule(resolve(dest, 'chapters', 'appendices'), 'appendices-1-lotukerf.html', 'm68859');
		writeModule(resolve(dest, 'chapters', 'appendices'), 'appendices-1-lotukerfid.html', 'm68859');
		writeModule(resolve(faithful, 'chapters', 'appendices'), 'appendices-1-lotukerfid.html', 'm68859');

		expect(pruneSupersededFiles(dest, faithful, 'efnafraedi-2e')).toBe(0);
		expect(existsSync(resolve(dest, 'chapters', '00', '0-1-inngangsordi.html'))).toBe(false);
		expect(existsSync(resolve(dest, 'chapters', 'appendices', 'appendices-1-lotukerf.html'))).toBe(false);
	});

	it('keeps both files and reports a conflict when no reviewed version exists', () => {
		const dest = resolve(root, 'dest');
		writeModule(resolve(dest, 'chapters', '10'), '10-5-fast-astand-efnis.html', 'm68770');
		writeModule(resolve(dest, 'chapters', '10'), '10-5-fastur-efnishamur.html', 'm68770');

		expect(pruneSupersededFiles(dest, null, 'efnafraedi-2e')).toBe(1);
		expect(existsSync(resolve(dest, 'chapters', '10', '10-5-fast-astand-efnis.html'))).toBe(true);
		expect(existsSync(resolve(dest, 'chapters', '10', '10-5-fastur-efnishamur.html'))).toBe(true);
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('m68770'));
	});

	it('returns 0 for a book with no chapters directory', () => {
		expect(pruneSupersededFiles(resolve(root, 'empty'), null, 'x')).toBe(0);
	});

	it('propagates a filesystem error instead of silently swallowing it', () => {
		// Root bypasses directory permission checks, so this can't force EACCES
		// there (e.g. some CI containers run as root). Skip rather than assert
		// a weaker thing.
		if (process.getuid && process.getuid() === 0) return;

		const dest = resolve(root, 'dest');
		const faithful = resolve(root, 'faithful');
		const chapterDir = resolve(dest, 'chapters', '03');
		writeModule(chapterDir, '3-3-fitusyrur.html', 'm66441');
		writeModule(chapterDir, '3-3-lipid.html', 'm66441');
		writeModule(resolve(faithful, 'chapters', '03'), '3-3-lipid.html', 'm66441');

		// Deleting a directory entry needs write permission on its PARENT
		// directory, not the file's own mode — so this forces the removal of
		// the superseded file to fail with EACCES regardless of the file's own
		// permissions. { force: true } (added for Finding 2 — tolerating a file
		// that vanished between readdirSync and rmSync) only suppresses ENOENT
		// for an already-missing path; it must NOT suppress this.
		chmodSync(chapterDir, 0o555);
		try {
			expect(() => pruneSupersededFiles(dest, faithful, 'liffraedi-2e')).toThrow(/EACCES|permission/i);
		} finally {
			// Restore write permission so afterEach's rmSync can clean up root.
			chmodSync(chapterDir, 0o755);
		}
	});
});

describe('tocRegenArgs', () => {
	it('forwards the source path as --efni-path, separate from the slug', () => {
		const args = tocRegenArgs('efnafraedi-2e', '/tmp/some-source-tree');

		expect(args).toContain('efnafraedi-2e');
		expect(args).toContain('--efni-path');
		expect(args).toContain('/tmp/some-source-tree');

		// The path must be its own array element (never concatenated into the
		// slug or an existing flag) — that is what keeps execFileSync from ever
		// needing a shell to interpret it.
		const efniPathIndex = args.indexOf('--efni-path');
		expect(args[efniPathIndex + 1]).toBe('/tmp/some-source-tree');
		expect(args[efniPathIndex + 1]).not.toBe('efnafraedi-2e');
	});
});

describe('selectBooks', () => {
	// The publication tree as it stands in namsbokasafn-efni.
	const SOURCE = [
		'edlisfraedi-2e',
		'efnafraedi-2e',
		'liffraedi-2e',
		'lifraen-efnafraedi',
		'orverufraedi'
	];

	it('a bare run syncs only the permitted books and reports the rest', () => {
		const result = selectBooks({ availableBooks: SOURCE });
		expect(result.error).toBeUndefined();
		expect(result.books).toEqual(['efnafraedi-2e', 'lifraen-efnafraedi']);
		expect(result.skipped).toEqual(['edlisfraedi-2e', 'liffraedi-2e', 'orverufraedi']);
		expect(result.overridden).toEqual([]);
	});

	it('refuses a named book that is held back, rather than skipping it silently', () => {
		const result = selectBooks({ availableBooks: SOURCE, requested: ['liffraedi-2e'] });
		expect(result.error).toBe('withheld');
		expect(result.refused).toEqual(['liffraedi-2e']);
		expect(result.books).toEqual([]);
	});

	it('refuses a mixed request as a whole — a permitted book does not carry a withheld one', () => {
		const result = selectBooks({
			availableBooks: SOURCE,
			requested: ['efnafraedi-2e', 'orverufraedi']
		});
		expect(result.error).toBe('withheld');
		expect(result.refused).toEqual(['orverufraedi']);
		expect(result.books).toEqual([]);
	});

	it('syncs a named permitted book', () => {
		const result = selectBooks({ availableBooks: SOURCE, requested: ['efnafraedi-2e'] });
		expect(result.error).toBeUndefined();
		expect(result.books).toEqual(['efnafraedi-2e']);
	});

	it('--allow-withheld publishes the named book and names it as an override', () => {
		const result = selectBooks({
			availableBooks: SOURCE,
			requested: ['liffraedi-2e'],
			allowWithheld: true
		});
		expect(result.error).toBeUndefined();
		expect(result.books).toEqual(['liffraedi-2e']);
		expect(result.overridden).toEqual(['liffraedi-2e']);
	});

	it('reports a book missing from the source before applying the ruling', () => {
		const result = selectBooks({ availableBooks: SOURCE, requested: ['stjornufraedi'] });
		expect(result.error).toBe('not-found');
		expect(result.invalid).toEqual(['stjornufraedi']);
	});

	it('errors rather than sweeping when the source holds only withheld books', () => {
		const result = selectBooks({ availableBooks: ['liffraedi-2e', 'orverufraedi'] });
		expect(result.error).toBe('empty');
		expect(result.books).toEqual([]);
	});

	// 🔴 The regression this exists to catch: the stale-directory sweep in main()
	// is keyed on `availableBooks`, not on the selection. If a future change ever
	// filters the source list by the allowlist instead of filtering the sync list,
	// every held-back book is swept out of static/content/ — turning a freeze into
	// a deletion of live pages. selectBooks must never narrow its input.
	it('leaves the source list untouched, so the sweep stays a freeze not a delete', () => {
		const availableBooks = [...SOURCE];
		selectBooks({ availableBooks });
		expect(availableBooks).toEqual(SOURCE);
	});
});
