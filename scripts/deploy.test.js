import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { deploy, parseArgs, rsyncArgs, summarizeItemized } from './deploy.js';
import { deployExcludes } from './deploy-excludes.js';

// A string, not new URL(): the jsdom test environment replaces the global URL class.
const DEPLOY_SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'deploy.js');

describe('parseArgs', () => {
	// 🔴 A deploy that runs for real by default turns a mistyped or exploratory
	// invocation into a production change.
	it('is a dry run unless --apply is given', () => {
		expect(parseArgs(['--target', 'host:/srv/build/'], {}).apply).toBe(false);
	});

	it('deploys for real only with --apply', () => {
		expect(parseArgs(['--target', 'host:/srv/build/', '--apply'], {}).apply).toBe(true);
	});

	it('takes the target from --target', () => {
		expect(parseArgs(['--target', 'siggi@host:/srv/build/'], {}).target).toBe('siggi@host:/srv/build/');
	});

	// An alternative to --target for manual use. deploy.js prints the target on
	// every run either way.
	it('falls back to DEPLOY_TARGET for the target', () => {
		expect(parseArgs([], { DEPLOY_TARGET: 'deploy@host:/' }).target).toBe('deploy@host:/');
	});

	it('refuses to run without a target', () => {
		expect(() => parseArgs([], {})).toThrow(/target/i);
	});

	// A mistyped --source would otherwise be dropped silently, and the freeze
	// list would be derived from the default efni checkout instead.
	it('rejects an unknown argument', () => {
		expect(() => parseArgs(['--target', 'host:/x/', '--sourc', '../other'], {})).toThrow(/--sourc/);
	});

	it('resolves --source and --build to absolute paths', () => {
		const opts = parseArgs(['--target', 'host:/x/', '--source', 'efni', '--build', 'out'], {});
		expect(opts.source).toBe(resolve('efni'));
		expect(opts.build).toBe(resolve('out'));
	});
});

describe('rsyncArgs', () => {
	const base = { buildDir: '/work/build', target: 'host:/srv/build/', filterFile: '/tmp/x/rules' };

	// 🔴 An --exclude-from file reads the `P` rule as a literal exclude pattern
	// that matches nothing, so the old hashed assets would be deleted.
	it('passes the rules as a merge filter, never as an exclude-from file', () => {
		const args = rsyncArgs({ ...base, apply: true });
		expect(args).toContain('--filter=merge /tmp/x/rules');
		expect(args.some((a) => a.startsWith('--exclude-from'))).toBe(false);
	});

	it('adds --dry-run unless applying', () => {
		expect(rsyncArgs({ ...base, apply: false })).toContain('--dry-run');
	});

	it('omits --dry-run when applying', () => {
		expect(rsyncArgs({ ...base, apply: true })).not.toContain('--dry-run');
	});

	// Without the trailing slash rsync copies the directory itself, so the site
	// would land in <target>/build/ and the live pages would never change.
	it('copies the contents of the build directory, not the directory', () => {
		const args = rsyncArgs({ ...base, apply: true });
		expect(args.slice(-2)).toEqual(['/work/build/', 'host:/srv/build/']);
	});

	// 🔴 --delete-excluded deletes exactly what the excludes exist to keep: the
	// frozen books and the PDFs.
	it('deletes stale files but never excluded ones', () => {
		const args = rsyncArgs({ ...base, apply: true });
		expect(args).toContain('--delete');
		expect(args).not.toContain('--delete-excluded');
	});
});

describe('summarizeItemized', () => {
	it('separates deletions from transfers in rsync --itemize-changes output', () => {
		const output = [
			'*deleting   stale/index.html',
			'*deleting   stale/',
			'>f+++++++++ _app/immutable/chunks/new.js',
			'>f.st...... efnafraedi-2e/kafli/01/index.html',
			'cd+++++++++ _app/immutable/assets/',
			'<f+++++++++ index.html',
			'.d..t...... ./',
			''
		].join('\n');
		expect(summarizeItemized(output)).toEqual({
			deleted: ['stale/index.html', 'stale/'],
			transferred: ['_app/immutable/chunks/new.js', 'efnafraedi-2e/kafli/01/index.html', 'index.html']
		});
	});
});

// ---------------------------------------------------------------------------
// Against a real rsync. A server copy holding the previous build, a frozen book
// and its PDFs is updated from a new build, and the result is inspected file by
// file. Fixture files get DIFFERENT sizes on each side: rsync's size+mtime quick
// check would otherwise skip a transfer and prove nothing.

const SOURCE_BOOKS = ['edlisfraedi-2e', 'efnafraedi-2e', 'liffraedi-2e', 'lifraen-efnafraedi', 'orverufraedi'];
const hasRsync = spawnSync('rsync', ['--version']).status === 0;

function write(root, rel, content) {
	const path = join(root, rel);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, content);
}

function makeFixture() {
	const root = mkdtempSync(join(tmpdir(), 'vefur-deploy-'));
	for (const slug of SOURCE_BOOKS) {
		mkdirSync(join(root, 'efni/books', slug, '05-publication/mt-preview/chapters/01'), { recursive: true });
	}
	// What production holds now: the previous build, a frozen book, the PDFs.
	write(root, 'server/index.html', 'o'.repeat(100));
	// One byte longer than the build's copy: same-size files written in the same
	// second pass rsync's quick check and are silently not transferred.
	write(root, 'server/_app/version.json', '{"version": "1787150207749"}');
	write(root, 'server/_app/immutable/assets/0.OLD.css', 'o'.repeat(200));
	write(root, 'server/_app/immutable/chunks/old.js', 'o'.repeat(300));
	write(root, 'server/edlisfraedi-2e/index.html', 'o'.repeat(400));
	write(root, 'server/print/edlisfraedi-2e/bok/index.html', 'o'.repeat(450));
	write(root, 'server/content/edlisfraedi-2e/toc.json', 'o'.repeat(500));
	write(root, 'server/liffraedi-2e/index.html', 'o'.repeat(410));
	write(root, 'server/orverufraedi/index.html', 'o'.repeat(420));
	// Editor backups that reached the server by an older route: one in a
	// published book (junk to remove) and one inside a frozen book (left alone,
	// like everything else in a frozen book).
	write(root, 'server/content/efnafraedi-2e/chapters/01/1-summary.html.backup.2026-06-16T14-48-50', 'o'.repeat(650));
	write(root, 'server/edlisfraedi-2e/kafli/04/index.html.backup.2026-01-01', 'o'.repeat(660));
	write(root, 'server/downloads/efnafraedi-2e/book.pdf', 'o'.repeat(600));
	write(root, 'server/efnafraedi-2e/kafli/01/index.html', 'o'.repeat(700));
	write(root, 'server/stale/index.html', 'o'.repeat(800));
	// The new build: new hashed assets, an updated page, and an editor backup
	// that static/content carried into build/.
	write(root, 'build/index.html', 'n'.repeat(111));
	write(root, 'build/_app/version.json', '{"version":"1790899999999"}');
	write(root, 'build/_app/immutable/assets/0.NEW.css', 'n'.repeat(222));
	write(root, 'build/_app/immutable/chunks/new.js', 'n'.repeat(333));
	write(root, 'build/content/efnafraedi-2e/toc.json', 'n'.repeat(555));
	// Every published book has content in a real build (the deploy refuses
	// otherwise, since it would delete that live book).
	write(root, 'build/content/lifraen-efnafraedi/toc.json', 'n'.repeat(556));
	write(root, 'build/efnafraedi-2e/kafli/01/index.html', 'n'.repeat(777));
	write(root, 'build/efnafraedi-2e/kafli/01/index.html.backup.2026-03-29T10-57-57', 'n'.repeat(999));
	return root;
}

const onServer = (root, rel) => existsSync(join(root, 'server', rel));

describe.skipIf(!hasRsync && !process.env.CI)('deploy against a real rsync', () => {
	let root;
	const quiet = () => {};

	beforeEach(() => {
		// CI must run this suite: a skip there would let the freeze break unseen.
		if (!hasRsync) throw new Error('rsync is not installed; this suite must run in CI');
		root = makeFixture();
	});

	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	const run = (apply) =>
		deploy({
			source: join(root, 'efni'),
			build: join(root, 'build'),
			target: join(root, 'server') + '/',
			apply,
			log: quiet
		});

	// 🔴 The bug this PR fixes. The control below shows the same fixture under
	// today's rules deletes the old files, so this test can fail. The new asset
	// is asserted too, so a deploy that transferred nothing cannot pass.
	it('uploads new hashed assets without deleting the ones frozen pages still load', () => {
		run(true);
		expect(onServer(root, '_app/immutable/chunks/new.js')).toBe(true);
		expect(onServer(root, '_app/immutable/assets/0.OLD.css')).toBe(true);
		expect(onServer(root, '_app/immutable/chunks/old.js')).toBe(true);
	});

	it('uploads the new build', () => {
		run(true);
		expect(onServer(root, '_app/immutable/assets/0.NEW.css')).toBe(true);
		expect(onServer(root, '_app/immutable/chunks/new.js')).toBe(true);
		expect(statSync(join(root, 'server/efnafraedi-2e/kafli/01/index.html')).size).toBe(777);
		expect(readFileSync(join(root, 'server/_app/version.json'), 'utf8')).toContain('1790899999999');
	});

	// The stale page going proves --delete ran in the same transfer.
	it('keeps the frozen book on every surface, and the PDFs, while deleting stale pages', () => {
		run(true);
		expect(onServer(root, 'stale/index.html')).toBe(false);
		expect(onServer(root, 'edlisfraedi-2e/index.html')).toBe(true);
		expect(onServer(root, 'print/edlisfraedi-2e/bok/index.html')).toBe(true);
		expect(onServer(root, 'content/edlisfraedi-2e/toc.json')).toBe(true);
		expect(onServer(root, 'downloads/efnafraedi-2e/book.pdf')).toBe(true);
	});

	it('deletes a page the new build no longer has', () => {
		run(true);
		expect(onServer(root, 'stale/index.html')).toBe(false);
	});

	// The page beside the backup must arrive, so a transfer that sent nothing
	// cannot pass.
	it('never uploads an editor backup', () => {
		run(true);
		expect(statSync(join(root, 'server/efnafraedi-2e/kafli/01/index.html')).size).toBe(777);
		expect(onServer(root, 'efnafraedi-2e/kafli/01/index.html.backup.2026-03-29T10-57-57')).toBe(false);
	});

	// A plain `-` exclude also protects a matching file on the receiver from
	// --delete, so a backup that reached the server once would stay forever.
	// The frozen book's own backup is left alone with the rest of that book.
	it('removes editor backups already on the server, outside the frozen books', () => {
		run(true);
		expect(onServer(root, 'content/efnafraedi-2e/chapters/01/1-summary.html.backup.2026-06-16T14-48-50')).toBe(false);
		expect(onServer(root, 'edlisfraedi-2e/kafli/04/index.html.backup.2026-01-01')).toBe(true);
	});

	// 🔴 A deploy pinned to an older efni commit, or an efni checkout where a
	// frozen book has no rendered chapters, used to drop that book from the
	// freeze list — and the deploy deleted its live pages with exit 0.
	it('keeps a frozen book on every surface when the efni tree lacks it', () => {
		rmSync(join(root, 'efni/books/edlisfraedi-2e'), { recursive: true });
		run(true);
		expect(onServer(root, 'stale/index.html')).toBe(false);
		expect(onServer(root, 'edlisfraedi-2e/index.html')).toBe(true);
		expect(onServer(root, 'print/edlisfraedi-2e/bok/index.html')).toBe(true);
		expect(onServer(root, 'content/edlisfraedi-2e/toc.json')).toBe(true);
	});

	it('keeps every frozen book when the efni tree holds only one book', () => {
		for (const slug of SOURCE_BOOKS.filter((s) => s !== 'efnafraedi-2e')) {
			rmSync(join(root, 'efni/books', slug), { recursive: true });
		}
		run(true);
		expect(onServer(root, 'stale/index.html')).toBe(false);
		expect(onServer(root, 'edlisfraedi-2e/index.html')).toBe(true);
		expect(onServer(root, 'liffraedi-2e/index.html')).toBe(true);
		expect(onServer(root, 'orverufraedi/index.html')).toBe(true);
	});

	// deploy.yml runs the command, not deploy(): a failed transfer must fail the
	// step, or the workflow reports "Deployed" while the site was not updated.
	it('exits non-zero from the command line when rsync fails', () => {
		const res = spawnSync(
			process.execPath,
			[DEPLOY_SCRIPT, '--source', join(root, 'efni'), '--build', join(root, 'build'), '--target', join(root, 'no/such/parent') + '/', '--apply'],
			{ encoding: 'utf-8' }
		);
		expect(res.status).not.toBe(0);
		expect(res.status).not.toBe(null);
	});

	it('reports what it transferred and deleted', () => {
		const result = run(true);
		expect(result.status).toBe(0);
		expect(result.deleted).toContain('stale/index.html');
		expect(result.transferred).toContain('_app/immutable/chunks/new.js');
	});

	it('changes nothing on a dry run, but reports what it would delete', () => {
		const result = run(false);
		expect(onServer(root, 'stale/index.html')).toBe(true);
		expect(onServer(root, '_app/immutable/chunks/new.js')).toBe(false);
		expect(result.deleted).toContain('stale/index.html');
	});

	// An empty or missing efni checkout means --source points at the wrong
	// place; stop before rsync runs rather than deploy on a guess.
	it('refuses when the efni checkout holds no books', () => {
		mkdirSync(join(root, 'empty-efni'));
		expect(() =>
			deploy({ source: join(root, 'empty-efni'), build: join(root, 'build'), target: join(root, 'server') + '/', apply: true, log: quiet })
		).toThrow(/no books/i);
		expect(onServer(root, 'stale/index.html')).toBe(true);
	});

	it('refuses when the build has no _app/version.json', () => {
		rmSync(join(root, 'build/_app/version.json'));
		expect(() => run(true)).toThrow(/version\.json/);
		expect(onServer(root, 'stale/index.html')).toBe(true);
	});

	// A build with no content for a published book — synced from an efni
	// commit that predates the book, say — would delete that live book from the
	// server with exit 0. The freeze only covers withheld books.
	it('refuses when the build has no content for a published book', () => {
		rmSync(join(root, 'build/content/lifraen-efnafraedi'), { recursive: true });
		expect(() => run(true)).toThrow(/lifraen-efnafraedi/);
		expect(onServer(root, 'stale/index.html')).toBe(true);
	});

	it('warns when the efni tree lacks a frozen book', () => {
		rmSync(join(root, 'efni/books/edlisfraedi-2e'), { recursive: true });
		const lines = [];
		deploy({ source: join(root, 'efni'), build: join(root, 'build'), target: join(root, 'server') + '/', apply: false, log: (line) => lines.push(line) });
		expect(lines.some((line) => line.includes('edlisfraedi-2e') && line.includes('missing'))).toBe(true);
	});

	// Control: today's deploy.yml rules (an --exclude-from file of the freeze
	// patterns) on the same fixture. It must delete the old assets, or the
	// fixture cannot tell the fix from the bug.
	it('control: the previous rules delete the old assets', () => {
		const rulesFile = join(root, 'old-excludes.txt');
		writeFileSync(rulesFile, deployExcludes(SOURCE_BOOKS).join('\n') + '\n');
		const res = spawnSync('rsync', ['-a', '--delete', `--exclude-from=${rulesFile}`, join(root, 'build') + '/', join(root, 'server') + '/']);
		expect(res.status).toBe(0);
		expect(onServer(root, '_app/immutable/chunks/old.js')).toBe(false);
		expect(onServer(root, 'edlisfraedi-2e/index.html')).toBe(true);
	});
});

describe('the deploy command', () => {
	// Node gives the entry module its REAL path, while process.argv[1] keeps the
	// path it was called by. A main guard comparing the two skips main() when
	// the checkout is reached through a symlink: no rsync, no output, exit 0.
	it('runs when invoked through a symlinked path', () => {
		const dir = mkdtempSync(join(tmpdir(), 'vefur-deploy-link-'));
		try {
			const link = join(dir, 'deploy.js');
			symlinkSync(DEPLOY_SCRIPT, link);
			const res = spawnSync(process.execPath, [link, '--no-such-flag'], { encoding: 'utf-8' });
			expect(res.status).toBe(1);
			expect(res.stderr).toContain('Unknown argument: --no-such-flag');
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	// `node scripts/deploy` (no .js) runs the module, but process.argv[1] then
	// names a path that does not exist, so a path-comparing guard skipped main().
	it('runs when invoked without the .js extension', () => {
		const res = spawnSync(process.execPath, [DEPLOY_SCRIPT.replace(/\.js$/, ''), '--no-such-flag'], { encoding: 'utf-8' });
		expect(res.status).toBe(1);
		expect(res.stderr).toContain('Unknown argument: --no-such-flag');
	});
});
