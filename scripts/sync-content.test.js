import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, chmodSync } from 'fs';
import { tmpdir } from 'os';
import { resolve } from 'path';
import { pruneSupersededFiles } from './sync-content.js';
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
