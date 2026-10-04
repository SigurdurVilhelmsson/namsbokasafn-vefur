import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { resolve } from 'path';
import { SYNC_STAMP_FILE, buildSyncStamp, readEfniState, writeSyncStamp } from './sync-stamp.js';

let root;

beforeEach(() => {
	root = mkdtempSync(resolve(tmpdir(), 'sync-stamp-'));
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

const git = (cwd, ...args) =>
	execFileSync('git', args, { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

/** An efni-shaped git repo with one committed page for `book`. */
function efniRepo(book = 'efnafraedi-2e') {
	const repo = resolve(root, 'efni');
	const page = resolve(repo, 'books', book, '05-publication', 'mt-preview', 'chapters', '01');
	mkdirSync(page, { recursive: true });
	writeFileSync(resolve(page, '1-1-a.html'), '<p>a</p>');
	git(repo, 'init', '-q', '-b', 'main');
	git(repo, '-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '.');
	git(repo, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'init');
	return { repo, page };
}

describe('readEfniState', () => {
	it('reads the commit and branch of the source checkout', () => {
		const { repo } = efniRepo();
		const state = readEfniState(repo, 'efnafraedi-2e');
		expect(state.commit).toBe(git(repo, 'rev-parse', 'HEAD'));
		expect(state.branch).toBe('main');
	});

	it('reports a clean publication folder as not dirty', () => {
		const { repo } = efniRepo();
		expect(readEfniState(repo, 'efnafraedi-2e').dirty).toBe(false);
	});

	it('reports uncommitted changes in the book publication folder as dirty', () => {
		const { repo, page } = efniRepo();
		writeFileSync(resolve(page, '1-1-a.html'), '<p>edited</p>');
		expect(readEfniState(repo, 'efnafraedi-2e').dirty).toBe(true);
	});

	it('ignores uncommitted changes outside that book publication folder', () => {
		const { repo } = efniRepo();
		writeFileSync(resolve(repo, 'README.md'), 'notes');
		expect(readEfniState(repo, 'efnafraedi-2e').dirty).toBe(false);
	});

	it('says whether the commit is on origin/main, and null without that ref', () => {
		const { repo } = efniRepo();
		expect(readEfniState(repo, 'efnafraedi-2e').onOriginMain).toBeNull();

		git(repo, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
		expect(readEfniState(repo, 'efnafraedi-2e').onOriginMain).toBe(true);

		// A local commit origin/main does not have: the 2026-10-04 mis-citation
		git(repo, 'checkout', '-q', '-b', 'content/local-pass');
		git(repo, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'wip');
		const state = readEfniState(repo, 'efnafraedi-2e');
		expect(state.branch).toBe('content/local-pass');
		expect(state.onOriginMain).toBe(false);
	});

	it('does not report an enclosing repository as the source', () => {
		const { repo } = efniRepo();
		const nested = resolve(repo, 'copy-of-efni');
		mkdirSync(nested);
		expect(readEfniState(nested, 'efnafraedi-2e').commit).toBeNull();
	});

	it('returns nulls, not a throw, when the source is not a git checkout', () => {
		const plain = resolve(root, 'plain');
		mkdirSync(plain);
		expect(readEfniState(plain, 'efnafraedi-2e')).toEqual({
			commit: null,
			branch: null,
			onOriginMain: null,
			dirty: null
		});
	});
});

describe('buildSyncStamp', () => {
	it('records the book, time, layers and both commits', () => {
		const stamp = buildSyncStamp({
			book: 'efnafraedi-2e',
			layers: ['mt-preview', 'faithful'],
			efni: { commit: 'abc', branch: 'main', onOriginMain: true, dirty: false },
			vefurCommit: 'def',
			now: new Date('2026-10-04T10:00:00Z')
		});
		expect(stamp).toEqual({
			book: 'efnafraedi-2e',
			syncedAt: '2026-10-04T10:00:00.000Z',
			layers: ['mt-preview', 'faithful'],
			efni: { commit: 'abc', branch: 'main', onOriginMain: true, dirty: false },
			vefurCommit: 'def'
		});
	});
});

describe('writeSyncStamp', () => {
	it('writes the stamp as JSON into the book folder', () => {
		const dest = resolve(root, 'content', 'efnafraedi-2e');
		mkdirSync(dest, { recursive: true });
		const stamp = { book: 'efnafraedi-2e', syncedAt: 'x' };
		writeSyncStamp(dest, stamp);
		const file = resolve(dest, SYNC_STAMP_FILE);
		expect(existsSync(file)).toBe(true);
		expect(JSON.parse(readFileSync(file, 'utf-8'))).toEqual(stamp);
	});
});
