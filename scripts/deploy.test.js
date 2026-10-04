import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, utimesSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { deploy, missingServiceWorkerImports, parseArgs, rsyncArgs, summarizeItemized } from './deploy.js';
import { deployExcludes, deployFilterRules } from './deploy-excludes.js';

// A string, not new URL(): the jsdom test environment replaces the global URL class.
const DEPLOY_SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'deploy.js');

describe('missingServiceWorkerImports', () => {
	let dir;
	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'sw-imports-'));
	});
	afterEach(() => rmSync(dir, { recursive: true, force: true }));

	it('names a file the service worker imports but the build lacks', () => {
		writeFileSync(join(dir, 'sw.js'), 'define([],(function(){importScripts("/sw-offline-book.js");}));');
		expect(missingServiceWorkerImports(dir)).toEqual(['/sw-offline-book.js']);
	});

	it('is satisfied when the imported file is in the build', () => {
		writeFileSync(join(dir, 'sw.js'), 'importScripts("/sw-offline-book.js");');
		writeFileSync(join(dir, 'sw-offline-book.js'), '');
		expect(missingServiceWorkerImports(dir)).toEqual([]);
	});

	it('ignores a variable importScripts (the workbox loader)', () => {
		writeFileSync(join(dir, 'sw.js'), 'importScripts(l);');
		expect(missingServiceWorkerImports(dir)).toEqual([]);
	});
});

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

	// nginx's ETag is mtime + size. With -t, every deploy stamped every file with
	// the build time, so every ETag changed though the bytes had not.
	it('compares files by checksum, not by size and mtime', () => {
		expect(rsyncArgs({ ...base, apply: true })).toContain('--checksum');
	});

	// rsync applies options in order: `--no-times -a` turns -t back on.
	it('turns times off AFTER -a, which implies them', () => {
		const args = rsyncArgs({ ...base, apply: true });
		expect(args).toContain('-az');
		expect(args.indexOf('--no-times')).toBeGreaterThan(args.indexOf('-az'));
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
			'.f...p..... content/efnafraedi-2e/toc.json',
			''
		].join('\n');
		expect(summarizeItemized(output)).toEqual({
			deleted: ['stale/index.html', 'stale/'],
			transferred: ['_app/immutable/chunks/new.js', 'efnafraedi-2e/kafli/01/index.html', 'index.html'],
			retimed: []
		});
	});

	// What `-a --checksum` does to an unchanged file: not sent, but its mtime,
	// and so its ETag, still changes. A dry run that counted transfers alone
	// would call that deploy clean.
	it('lists files that keep their bytes but get a new mtime', () => {
		const output = ['.f..t...... content/efnafraedi-2e/fig.svg', '>f..T...... index.html', ''].join('\n');
		expect(summarizeItemized(output).retimed).toEqual(['content/efnafraedi-2e/fig.svg']);
	});
});

// ---------------------------------------------------------------------------
// Against a real rsync. A server copy holding the previous build, a frozen book
// and its PDFs is updated from a new build, and the result is inspected file by
// file. Fixture files get DIFFERENT sizes on each side: the deploy compares
// checksums, but the control arms run a plain `rsync -a`, whose size+mtime quick
// check would skip a same-size transfer and prove nothing.

const SOURCE_BOOKS = ['edlisfraedi-2e', 'efnafraedi-2e', 'liffraedi-2e', 'lifraen-efnafraedi', 'orverufraedi'];
const hasRsync = spawnSync('rsync', ['--version']).status === 0;

const UNCHANGED_FIGURE = 'content/efnafraedi-2e/chapters/01/images/media/fig.svg';
const SAME_SIZE_PAGE = 'content/efnafraedi-2e/chapters/01/1-1-intro.html';
const LAST_DEPLOY = new Date('2026-08-19T14:36:47Z');
// Every build stamps every file with the build time. A fixed one, unlike the
// time the fixture is written: rsync's quick check compares whole seconds, so a
// build written in the same second as the deploy would look unchanged to a
// deploy that compared mtimes instead of checksums.
const BUILD_TIME = new Date('2026-10-01T00:00:00Z');
const mtimeOnServer = (root, rel) => statSync(join(root, 'server', rel)).mtimeMs;

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
	// The retired book, live on every surface.
	write(root, 'server/lifraen-efnafraedi/index.html', 'o'.repeat(430));
	write(root, 'server/print/lifraen-efnafraedi/bok/index.html', 'o'.repeat(440));
	write(root, 'server/content/lifraen-efnafraedi/toc.json', 'o'.repeat(460));
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
	// A dev machine's static/content still holds the retired book (gitignored,
	// and the sync keeps it while efni has it), so a build copies it in.
	write(root, 'build/content/lifraen-efnafraedi/toc.json', 'n'.repeat(556));
	write(root, 'build/efnafraedi-2e/kafli/01/index.html', 'n'.repeat(777));
	write(root, 'build/efnafraedi-2e/kafli/01/index.html.backup.2026-03-29T10-57-57', 'n'.repeat(999));
	// The new build's copies of the figure and page described below.
	write(root, `build/${UNCHANGED_FIGURE}`, 'f'.repeat(900));
	write(root, `build/${SAME_SIZE_PAGE}`, 'n'.repeat(880));
	// The build stamps every file it writes with the build time.
	for (const rel of readdirSync(join(root, 'build'), { recursive: true })) {
		utimesSync(join(root, 'build', rel), BUILD_TIME, BUILD_TIME);
	}
	// A figure the new build did not change: same bytes, an older mtime.
	write(root, `server/${UNCHANGED_FIGURE}`, 'f'.repeat(900));
	utimesSync(join(root, 'server', UNCHANGED_FIGURE), LAST_DEPLOY, LAST_DEPLOY);
	// A page whose bytes changed while its size and mtime did not: rsync's
	// quick check cannot tell the two copies apart.
	write(root, `server/${SAME_SIZE_PAGE}`, 'o'.repeat(880));
	utimesSync(join(root, 'server', SAME_SIZE_PAGE), LAST_DEPLOY, LAST_DEPLOY);
	utimesSync(join(root, 'build', SAME_SIZE_PAGE), LAST_DEPLOY, LAST_DEPLOY);
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

	// Whatever runs the command (a person, a script) must see a failed transfer
	// as a failure, or it reports "Deployed" while the site was not updated.
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

	// 🔴 nginx's ETag and Last-Modified come from the mtime. A file the build did
	// not change must keep its server mtime, or every deploy turns each reader's
	// revalidation of it into a full 200 instead of a 304.
	it('leaves an unchanged file, and its mtime, alone on the server', () => {
		const result = run(true);
		expect(result.transferred).not.toContain(UNCHANGED_FIGURE);
		expect(result.retimed).toEqual([]);
		expect(mtimeOnServer(root, UNCHANGED_FIGURE)).toBe(LAST_DEPLOY.getTime());
	});

	// Control: --checksum with -a's own times. The file is not sent, yet its
	// mtime moves, so the test above can fail and --checksum alone is no fix.
	it('control: rsync -a --checksum skips an unchanged file but still moves its mtime', () => {
		const res = spawnSync('rsync', ['-a', '--checksum', '--itemize-changes', join(root, 'build') + '/', join(root, 'server') + '/'], {
			encoding: 'utf-8'
		});
		expect(res.status).toBe(0);
		expect(summarizeItemized(res.stdout).retimed).toContain(UNCHANGED_FIGURE);
		expect(mtimeOnServer(root, UNCHANGED_FIGURE)).toBe(BUILD_TIME.getTime());
	});

	// A changed file must get a NEW mtime, so its ETag changes and readers fetch it.
	it('sends a changed file and gives it a new mtime', () => {
		run(true);
		expect(statSync(join(root, 'server/efnafraedi-2e/kafli/01/index.html')).size).toBe(777);
		expect(mtimeOnServer(root, 'efnafraedi-2e/kafli/01/index.html')).toBeGreaterThan(LAST_DEPLOY.getTime());
	});

	it('sends a changed file even when its size and mtime match the server copy', () => {
		run(true);
		expect(readFileSync(join(root, 'server', SAME_SIZE_PAGE), 'utf8')).toBe('n'.repeat(880));
		expect(mtimeOnServer(root, SAME_SIZE_PAGE)).toBeGreaterThan(LAST_DEPLOY.getTime());
	});

	// Control: the quick check skips it, so the test above can fail.
	it('control: rsync -a skips a changed file whose size and mtime match', () => {
		const res = spawnSync('rsync', ['-a', join(root, 'build') + '/', join(root, 'server') + '/']);
		expect(res.status).toBe(0);
		expect(readFileSync(join(root, 'server', SAME_SIZE_PAGE), 'utf8')).toBe('o'.repeat(880));
	});

	// The dry run's count is what the operator reads: once deployed, the same
	// build must report nothing to send or delete.
	it('reports nothing to do when the server already holds the build', () => {
		expect(run(true).transferred.length).toBeGreaterThan(0);
		const again = run(false);
		expect(again.transferred).toEqual([]);
		expect(again.deleted).toEqual([]);
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
		rmSync(join(root, 'build/content/efnafraedi-2e'), { recursive: true });
		expect(() => run(true)).toThrow(/efnafraedi-2e/);
		expect(onServer(root, 'stale/index.html')).toBe(true);
	});

	it('warns when the efni tree lacks a frozen book', () => {
		rmSync(join(root, 'efni/books/edlisfraedi-2e'), { recursive: true });
		const lines = [];
		deploy({ source: join(root, 'efni'), build: join(root, 'build'), target: join(root, 'server') + '/', apply: false, log: (line) => lines.push(line) });
		expect(lines.some((line) => line.includes('edlisfraedi-2e') && line.includes('missing'))).toBe(true);
	});

	// 🔴 Retiring a book takes it OFF the server. The freeze must not keep it,
	// and the build's leftover copy must not be uploaded in its place. The
	// chemistry page and the stale page show the transfer and --delete both ran.
	it('removes a retired book from every surface on the server', () => {
		run(true);
		expect(statSync(join(root, 'server/efnafraedi-2e/kafli/01/index.html')).size).toBe(777);
		expect(onServer(root, 'stale/index.html')).toBe(false);
		expect(onServer(root, 'lifraen-efnafraedi/index.html')).toBe(false);
		expect(onServer(root, 'print/lifraen-efnafraedi/bok/index.html')).toBe(false);
		expect(onServer(root, 'content/lifraen-efnafraedi/toc.json')).toBe(false);
	});

	it('keeps the three paused books while removing the retired one', () => {
		run(true);
		expect(onServer(root, 'lifraen-efnafraedi/index.html')).toBe(false);
		expect(onServer(root, 'edlisfraedi-2e/index.html')).toBe(true);
		expect(onServer(root, 'liffraedi-2e/index.html')).toBe(true);
		expect(onServer(root, 'orverufraedi/index.html')).toBe(true);
	});

	it('removes a retired book the efni tree no longer holds', () => {
		rmSync(join(root, 'efni/books/lifraen-efnafraedi'), { recursive: true });
		run(true);
		expect(onServer(root, 'stale/index.html')).toBe(false);
		expect(onServer(root, 'lifraen-efnafraedi/index.html')).toBe(false);
		expect(onServer(root, 'content/lifraen-efnafraedi/toc.json')).toBe(false);
	});

	// The dry run is what the operator reads before --apply: the retired book's
	// deletions must be expected there, not mistaken for a broken freeze.
	it('lists the retired book among the dry run deletions, and says why', () => {
		const lines = [];
		const result = deploy({ source: join(root, 'efni'), build: join(root, 'build'), target: join(root, 'server') + '/', apply: false, log: (line) => lines.push(line) });
		expect(result.deleted).toContain('lifraen-efnafraedi/index.html');
		expect(lines.some((line) => line.includes('lifraen-efnafraedi') && /retired/i.test(line))).toBe(true);
	});

	it('does not claim to protect a retired book the efni tree lacks', () => {
		rmSync(join(root, 'efni/books/lifraen-efnafraedi'), { recursive: true });
		const lines = [];
		deploy({ source: join(root, 'efni'), build: join(root, 'build'), target: join(root, 'server') + '/', apply: false, log: (line) => lines.push(line) });
		expect(lines.some((line) => line.includes('lifraen-efnafraedi') && line.includes('protecting'))).toBe(false);
	});

	// Control: the same rules without the retired book's hide rule. The build's
	// leftover copy is uploaded, so the fixture can tell the rule from its absence.
	it('control: without the hide rule, the leftover copy of the retired book is uploaded', () => {
		const rulesFile = join(root, 'no-hide.rules');
		const rules = deployFilterRules(SOURCE_BOOKS).filter((rule) => rule !== 'H lifraen-efnafraedi/');
		writeFileSync(rulesFile, rules.join('\n') + '\n');
		const res = spawnSync('rsync', ['-a', '--delete', `--filter=merge ${rulesFile}`, join(root, 'build') + '/', join(root, 'server') + '/']);
		expect(res.status).toBe(0);
		expect(statSync(join(root, 'server/content/lifraen-efnafraedi/toc.json')).size).toBe(556);
	});

	// Control: the rules the retired deploy.yml used (an --exclude-from file of the freeze
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
