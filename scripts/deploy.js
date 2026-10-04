#!/usr/bin/env node
/**
 * Deploy the built site with the rules production needs. This is THE deploy
 * command, run by hand from a machine with SSH access to the server (the
 * GitHub deploy workflow was retired on 2026-10-03).
 *
 * WHAT IT PROTECTS (rules from deployFilterRules() in scripts/deploy-excludes.js)
 *
 * - The hashed `/_app/immutable/` CSS/JS of earlier builds. The frozen books'
 *   pages are never rebuilt, so they keep loading the assets of the build they
 *   were deployed with; nginx answers a missing one with 404. Those files stay on
 *   the server (a receiver-side `P` rule) while the new build's files upload.
 * - The withheld books and `downloads/`: neither sent nor deleted (the freeze),
 *   including a frozen book the efni checkout lacks. A RETIRED book is the
 *   exception: never sent, and its server copy is deleted (RETIRED_BOOKS).
 * - Editor artifacts: never sent, even though a build copies them from
 *   static/content into build/; copies already on the server outside a frozen
 *   book are deleted.
 * - Unchanged files keep their ETag: only files whose bytes changed are sent,
 *   so the transfer count is a real diff (see rsyncArgs).
 *
 * The rules travel as `--filter='merge FILE'`. Never put them in an
 * `--exclude-from` file (it reads the `P` rule as an exclude that matches
 * nothing), and never add `--delete-excluded` (it deletes what the excludes keep).
 *
 * It is a DRY RUN unless --apply is given: it prints the rules and every file it
 * would delete, and changes nothing.
 *
 * Usage:
 *   node scripts/deploy.js --target <dest> [--source ../namsbokasafn-efni] [--build build] [--apply]
 *
 *   --target  an rsync destination: a local path, or user@host:/path/ over SSH
 *             (DEPLOY_TARGET in the environment also works). SSH options go in
 *             rsync's own RSYNC_RSH variable.
 *   --source  the efni checkout. The freeze list is derived from the books in
 *             it plus every book vefur registers (KNOWN_BOOKS); the deploy
 *             refuses to run if it holds no books at all.
 *   --build   the built site (default: build).
 */

import { spawnSync } from 'child_process';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getSourceBooks } from './sync-content.js';
import { deployFilterRules } from './deploy-excludes.js';
import { KNOWN_BOOKS, PUBLISHED_BOOKS, RETIRED_BOOKS, isRetired, withheldBooks } from './lib/published-books.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const DEFAULT_SOURCE = resolve(projectRoot, '..', 'namsbokasafn-efni');
const DEFAULT_BUILD = resolve(projectRoot, 'build');

/**
 * @param {string[]} argv command-line arguments (without node and the script)
 * @param {Record<string, string | undefined>} env environment (for DEPLOY_TARGET)
 * @returns {{ source: string, build: string, target: string, apply: boolean }}
 */
export function parseArgs(argv, env) {
	const options = {
		source: DEFAULT_SOURCE,
		build: DEFAULT_BUILD,
		target: env.DEPLOY_TARGET || '',
		apply: false
	};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--apply') options.apply = true;
		else if (arg === '--target') options.target = argv[++i] || '';
		else if (arg === '--source' || arg === '-s') options.source = resolve(argv[++i] || '');
		else if (arg === '--build') options.build = resolve(argv[++i] || '');
		else throw new Error(`Unknown argument: ${arg}`);
	}
	if (!options.target) {
		throw new Error('No target: pass --target <rsync destination> or set DEPLOY_TARGET');
	}
	return options;
}

/**
 * The rsync arguments for one deploy run. Pure, so the flags can be pinned by tests.
 *
 * `--checksum --no-times`: a file is sent only when its BYTES differ, and the
 * server's mtime moves only when one is sent. nginx builds ETag and
 * Last-Modified from the mtime, and every build stamps every file with the
 * build time, so with `-t` each deploy changed every ETag and a reader's next
 * revalidation of each figure and page was a full 200 instead of a 304.
 * The two only work as a pair. `--checksum` alone is not enough: with `-t`
 * still on, rsync skips an identical file but still copies its new mtime
 * across. `--no-times` alone is worse than `-a`: rsync treats a missing `-t` as
 * `--ignore-times` and sends every file. `--no-times` must also come AFTER `-a`,
 * which turns `-t` back on (rsync applies options in order).
 */
export function rsyncArgs({ buildDir, target, filterFile, apply }) {
	const args = ['-az', '--no-times', '--checksum', '--delete', `--filter=merge ${filterFile}`, '--itemize-changes'];
	if (!apply) args.push('--dry-run');
	// The trailing slash copies the CONTENTS of the build directory.
	args.push(buildDir.endsWith('/') ? buildDir : `${buildDir}/`, target);
	return args;
}

/**
 * Split rsync --itemize-changes output into deletions, file transfers, and
 * files that are not sent but get a new mtime (`.f..t…`: a new ETag for the
 * same bytes, which rsyncArgs exists to prevent). Directory, symlink and other
 * attribute-only lines are none of these.
 */
export function summarizeItemized(output) {
	const deleted = [];
	const transferred = [];
	const retimed = [];
	for (const line of output.split('\n')) {
		if (line.startsWith('*deleting')) deleted.push(line.slice('*deleting'.length).trim());
		else if (/^[<>]f/.test(line)) transferred.push(line.slice(12));
		else if (/^\.f..[tT]/.test(line)) retimed.push(line.slice(12));
	}
	return { deleted, transferred, retimed };
}

function buildVersion(buildDir) {
	const versionFile = join(buildDir, '_app', 'version.json');
	if (!existsSync(versionFile)) {
		throw new Error(`${versionFile} is missing: is ${buildDir} a SvelteKit build? Run npm run build first.`);
	}
	const { version } = JSON.parse(readFileSync(versionFile, 'utf8'));
	const date = new Date(Number(version));
	return isNaN(date) ? version : `${version} = ${date.toISOString()}`;
}

/**
 * Files the build's service worker imports (`importScripts("/x.js")`) that the
 * build does not contain. Such a worker still installs, but the failed import
 * leaves it with no routes and no precache: offline reading silently stops.
 * @returns {string[]} the missing paths; [] when there is no sw.js
 */
export function missingServiceWorkerImports(buildDir) {
	const swFile = join(buildDir, 'sw.js');
	if (!existsSync(swFile)) return [];
	const sw = readFileSync(swFile, 'utf8');
	const imports = [...sw.matchAll(/importScripts\(\s*["'](\/[^"']+)["']\s*\)/g)].map((m) => m[1]);
	return imports.filter((path) => !existsSync(join(buildDir, path)));
}

/**
 * Run one deploy. Throws before rsync runs if a precondition fails.
 * @returns {{ status: number, deleted: string[], transferred: string[] }}
 */
export function deploy({ source, build, target, apply, log = console.log }) {
	const version = buildVersion(build);
	const missingImports = missingServiceWorkerImports(build);
	if (missingImports.length > 0) {
		throw new Error(
			`The build's sw.js imports ${missingImports.join(', ')}, which the build does not contain: ` +
				'that service worker would install with no routes, and offline reading would stop.'
		);
	}
	// The freeze covers withheld books only. A published book with no content in
	// the build (synced from an efni commit that predates it, say) would be
	// deleted from the server — taking it down must be a decision, not this.
	const absent = PUBLISHED_BOOKS.filter((slug) => !existsSync(join(build, 'content', slug)));
	if (absent.length > 0) {
		throw new Error(
			`The build has no content for ${absent.join(', ')}, which the allowlist publishes: ` +
				'deploying it would delete the live book. Sync it, or take it off PUBLISHED_BOOKS on purpose.'
		);
	}
	const availableBooks = getSourceBooks(source);
	// No books at all means --source points at the wrong place: stop rather than
	// deploy on a guess.
	if (availableBooks.length === 0) {
		throw new Error(`No books found in ${source}: is --source the efni checkout?`);
	}
	const rules = deployFilterRules(availableBooks);
	// The rules protect these anyway (KNOWN_BOOKS); say so, since an efni tree
	// missing a frozen book usually means an old pin or a partial checkout.
	const missing = withheldBooks(KNOWN_BOOKS).filter(
		(slug) => !isRetired(slug) && !availableBooks.includes(slug)
	);

	const tmp = mkdtempSync(join(tmpdir(), 'vefur-deploy-'));
	const filterFile = join(tmp, 'rules');
	writeFileSync(filterFile, rules.join('\n') + '\n');

	log(apply ? 'Deploying.' : 'DRY RUN: nothing will change. Pass --apply to deploy.');
	log(`  build:  ${build} (version ${version})`);
	log(`  target: ${target}`);
	log('  rules:');
	for (const rule of rules) log(`    ${rule}`);
	for (const slug of missing) {
		log(`  ⚠️ ${slug} is held back but missing from ${source}; protecting it on the server anyway.`);
	}
	for (const slug of RETIRED_BOOKS) {
		log(`  ${slug} is retired: never sent, and the server's copy is deleted (expect its paths below).`);
	}

	try {
		const result = spawnSync('rsync', rsyncArgs({ buildDir: build, target, filterFile, apply }), {
			encoding: 'utf-8',
			stdio: ['ignore', 'pipe', 'inherit'],
			maxBuffer: 256 * 1024 * 1024
		});
		if (result.error) throw new Error(`Could not run rsync: ${result.error.message}`);

		const summary = summarizeItemized(result.stdout || '');
		const verb = apply ? '' : 'would be ';
		log(`${summary.transferred.length} files ${verb}transferred, ${summary.deleted.length} ${verb}deleted.`);
		for (const path of summary.deleted) log(`  deleted: ${path}`);
		if (summary.retimed.length > 0) {
			log(
				`⚠️ ${summary.retimed.length} unchanged files ${verb}given a new mtime, so a new ETag: ` +
					'are the rsync flags still --checksum --no-times, in that order after -az?'
			);
		}
		if (result.status !== 0) log(`rsync exited with status ${result.status}.`);
		return { status: result.status ?? 1, ...summary };
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
}

function main() {
	let options;
	try {
		options = parseArgs(process.argv.slice(2), process.env);
		const { status } = deploy(options);
		process.exit(status);
	} catch (err) {
		console.error(`Error: ${err.message}`);
		process.exit(1);
	}
}

// import.meta.main is true for the entry module however it was named — through
// a symlink, or without its .js extension. Comparing process.argv[1] with the
// module's path got both wrong: main() was skipped and the deploy exited 0
// having done nothing. The realpath comparison is a fallback for a runtime
// without import.meta.main.
function isEntryPoint() {
	if (typeof import.meta.main === 'boolean') return import.meta.main;
	if (!process.argv[1]) return false;
	try {
		return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
	} catch {
		return false;
	}
}

if (isEntryPoint()) {
	main();
}
