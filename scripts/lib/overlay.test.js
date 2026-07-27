import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { resolve } from 'path';
import {
	moduleIdOf,
	fileIdentity,
	chapterIdentityIndex,
	resetIdentityCache,
	chapterFullyFaithful
} from './overlay.js';

let root;

beforeEach(() => {
	root = mkdtempSync(resolve(tmpdir(), 'overlay-'));
	resetIdentityCache();
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
	resetIdentityCache();
});

/** A rendered reading module, as the CNXML pipeline emits it. */
function writeModule(dir, filename, moduleId) {
	mkdirSync(dir, { recursive: true });
	writeFileSync(
		resolve(dir, filename),
		`<article class="cnx-module" data-module-id="${moduleId}"><h1 id="title">T</h1></article>`
	);
}

/** A chapter rollup — summary/exercises/answer-key carry no module id. */
function writeRollup(dir, filename) {
	mkdirSync(dir, { recursive: true });
	writeFileSync(resolve(dir, filename), '<section class="chapter-summary"></section>');
}

/** A page the pipeline emitted without a module id — the identity fallback. */
function writeIdlessPage(dir, filename) {
	mkdirSync(dir, { recursive: true });
	writeFileSync(
		resolve(dir, filename),
		'<article class="cnx-module"><h1 id="title">T</h1></article>'
	);
}

describe('moduleIdOf', () => {
	it('returns the module id of a rendered module', () => {
		writeModule(root, '3-3-lipid.html', 'm66441');
		expect(moduleIdOf(resolve(root, '3-3-lipid.html'))).toBe('m66441');
	});

	it('returns null for a rollup that carries no module id', () => {
		writeRollup(root, '3-summary.html');
		expect(moduleIdOf(resolve(root, '3-summary.html'))).toBeNull();
	});

	it('returns null for a file that does not exist', () => {
		expect(moduleIdOf(resolve(root, 'absent.html'))).toBeNull();
	});
});

describe('fileIdentity', () => {
	it('keys a reading module on its module id', () => {
		writeModule(root, '3-3-lipid.html', 'm66441');
		expect(fileIdentity(root, '3-3-lipid.html')).toBe('module:m66441');
	});

	it('keys a rollup on its filename in the aggregation namespace', () => {
		writeRollup(root, '3-summary.html');
		expect(fileIdentity(root, '3-summary.html')).toBe('agg:3-summary.html');
	});

	it('keys a page with no module id on its filename', () => {
		writeIdlessPage(root, '3-6-no-module-id.html');
		expect(fileIdentity(root, '3-6-no-module-id.html')).toBe('file:3-6-no-module-id.html');
	});

	it('keys key-terms on its filename despite its synthetic module id', () => {
		writeModule(root, '3-key-terms.html', '03-key-terms');
		expect(fileIdentity(root, '3-key-terms.html')).toBe('agg:3-key-terms.html');
	});

	it('gives the same module the same identity under two filenames', () => {
		writeModule(root, '3-3-fitusyrur.html', 'm66441');
		writeModule(root, '3-3-lipid.html', 'm66441');
		expect(fileIdentity(root, '3-3-fitusyrur.html')).toBe(
			fileIdentity(root, '3-3-lipid.html')
		);
	});
});

describe('chapterIdentityIndex', () => {
	it('maps every html file in the directory to its identity', () => {
		writeModule(root, '3-1-kolvetni.html', 'm66440');
		writeRollup(root, '3-summary.html');
		expect(chapterIdentityIndex(root)).toEqual(
			new Map([
				['3-1-kolvetni.html', 'module:m66440'],
				['3-summary.html', 'agg:3-summary.html']
			])
		);
	});

	it('ignores non-html files', () => {
		writeModule(root, '3-1-kolvetni.html', 'm66440');
		writeFileSync(resolve(root, 'notes.txt'), 'x');
		expect([...chapterIdentityIndex(root).keys()]).toEqual(['3-1-kolvetni.html']);
	});

	it('returns an empty index for a directory that does not exist', () => {
		expect(chapterIdentityIndex(resolve(root, 'absent')).size).toBe(0);
	});

	it('serves a memoized index until the cache is reset', () => {
		writeModule(root, '3-1-kolvetni.html', 'm66440');
		chapterIdentityIndex(root);
		writeModule(root, '3-2-lipid.html', 'm66441');
		expect(chapterIdentityIndex(root).size).toBe(1);
		resetIdentityCache();
		expect(chapterIdentityIndex(root).size).toBe(2);
	});
});

describe('chapterFullyFaithful', () => {
	/** Build faithful/ and mt-preview/ chapter dirs, return their chapters/ roots. */
	function tracks() {
		return {
			faithful: resolve(root, 'faithful', 'chapters'),
			mt: resolve(root, 'mt-preview', 'chapters')
		};
	}

	it('is true when a reviewed module was renamed but every module is covered', () => {
		const { faithful, mt } = tracks();
		writeModule(resolve(mt, '03'), '3-3-fitusyrur.html', 'm66441');
		writeRollup(resolve(mt, '03'), '3-summary.html');
		writeModule(resolve(faithful, '03'), '3-3-lipid.html', 'm66441');
		expect(chapterFullyFaithful(faithful, mt, '03')).toBe(true);
	});

	it('is false when a module has no reviewed version at all', () => {
		const { faithful, mt } = tracks();
		writeModule(resolve(mt, '03'), '3-3-lipid.html', 'm66441');
		writeModule(resolve(mt, '03'), '3-4-protin.html', 'm66442');
		writeModule(resolve(faithful, '03'), '3-3-lipid.html', 'm66441');
		expect(chapterFullyFaithful(faithful, mt, '03')).toBe(false);
	});

	it('is true when the chapter exists only in faithful', () => {
		const { faithful, mt } = tracks();
		mkdirSync(mt, { recursive: true });
		writeModule(resolve(faithful, '03'), '3-3-lipid.html', 'm66441');
		expect(chapterFullyFaithful(faithful, mt, '03')).toBe(true);
	});

	it('ignores rollups when judging coverage', () => {
		const { faithful, mt } = tracks();
		writeModule(resolve(mt, '03'), '3-3-lipid.html', 'm66441');
		writeRollup(resolve(mt, '03'), '3-exercises.html');
		writeModule(resolve(faithful, '03'), '3-3-lipid.html', 'm66441');
		expect(chapterFullyFaithful(faithful, mt, '03')).toBe(true);
	});
});
