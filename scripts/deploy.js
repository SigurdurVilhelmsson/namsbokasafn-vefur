#!/usr/bin/env node
/**
 * Deploy the built site with the rules production needs. ONE command for both
 * paths: `deploy.yml` calls it, and so does a manual deploy.
 *
 * WHAT IT PROTECTS (rules from deployFilterRules() in scripts/deploy-excludes.js)
 *
 * - The hashed `/_app/immutable/` CSS/JS of earlier builds. The frozen books'
 *   pages are never rebuilt, so they keep loading the assets of the build they
 *   were deployed with; nginx answers a missing one with 404. Those files stay on
 *   the server (a receiver-side `P` rule) while the new build's files upload.
 * - The withheld books and `downloads/`: neither sent nor deleted (the freeze),
 *   including a frozen book the efni checkout lacks.
 * - Editor artifacts: never sent, even though a build copies them from
 *   static/content into build/; copies already on the server outside a frozen
 *   book are deleted.
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
import { KNOWN_BOOKS, withheldBooks } from './lib/published-books.js';

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

/** The rsync arguments for one deploy run. Pure, so the flags can be pinned by tests. */
export function rsyncArgs({ buildDir, target, filterFile, apply }) {
	const args = ['-az', '--delete', `--filter=merge ${filterFile}`, '--itemize-changes'];
	if (!apply) args.push('--dry-run');
	// The trailing slash copies the CONTENTS of the build directory.
	args.push(buildDir.endsWith('/') ? buildDir : `${buildDir}/`, target);
	return args;
}

/**
 * Split rsync --itemize-changes output into deletions and file transfers.
 * Directory lines (`cd…`, `.d…`) are neither.
 */
export function summarizeItemized(output) {
	const deleted = [];
	const transferred = [];
	for (const line of output.split('\n')) {
		if (line.startsWith('*deleting')) deleted.push(line.slice('*deleting'.length).trim());
		else if (/^[<>]f/.test(line)) transferred.push(line.slice(12));
	}
	return { deleted, transferred };
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
 * Run one deploy. Throws before rsync runs if a precondition fails.
 * @returns {{ status: number, deleted: string[], transferred: string[] }}
 */
export function deploy({ source, build, target, apply, log = console.log }) {
	const version = buildVersion(build);
	const availableBooks = getSourceBooks(source);
	// No books at all means --source points at the wrong place: stop rather than
	// deploy on a guess.
	if (availableBooks.length === 0) {
		throw new Error(`No books found in ${source}: refusing to deploy without the freeze list.`);
	}
	const rules = deployFilterRules(availableBooks);
	// The rules protect these anyway (KNOWN_BOOKS); say so, since an efni tree
	// missing a frozen book usually means an old pin or a partial checkout.
	const missing = withheldBooks(KNOWN_BOOKS).filter((slug) => !availableBooks.includes(slug));

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

// Compare REAL paths: Node gives the entry module its resolved path, while
// process.argv[1] keeps the one it was called by, so a symlinked checkout would
// otherwise skip main() and exit 0 having done nothing.
function isEntryPoint() {
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
