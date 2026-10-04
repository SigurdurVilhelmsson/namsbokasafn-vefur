/**
 * The sync stamp: which efni commit a book's synced content came from.
 *
 * sync-content.js writes `static/content/<book>/sync-stamp.json` after each
 * successful book sync. The build copies it to `build/content/<book>/`, so on
 * the live site `GET /content/<book>/sync-stamp.json` answers "which efni
 * commit is live?". Before it, nothing recorded that.
 *
 * `onOriginMain` exists because a checkout's HEAD is not efni main: on
 * 2026-10-04 a handoff cited the efni checkout's HEAD as "main", and it was an
 * unpushed local commit of a session mid-pass. It is read from the checkout's
 * own origin/main ref, so it is only as fresh as that checkout's last fetch.
 */

import { execFileSync } from 'child_process';
import { realpathSync, writeFileSync } from 'fs';
import { resolve } from 'path';

export const SYNC_STAMP_FILE = 'sync-stamp.json';

/** Run git in `cwd`; null when it fails (not a checkout, no such ref). */
function git(cwd, args) {
	try {
		return execFileSync('git', args, {
			cwd,
			encoding: 'utf-8',
			stdio: ['ignore', 'pipe', 'ignore']
		}).trim();
	} catch {
		return null;
	}
}

/**
 * The git state of the efni checkout a book is synced from. Every field is
 * null when it cannot be read; reading never throws, so a stamp can never
 * fail a sync.
 *
 * @param {string} sourceDir - the efni checkout (sync-content's --source)
 * @param {string} bookSlug
 * @returns {{commit: string|null, branch: string|null, onOriginMain: boolean|null, dirty: boolean|null}}
 */
export function readEfniState(sourceDir, bookSlug) {
	const none = { commit: null, branch: null, onOriginMain: null, dirty: null };
	// git looks upward for a repository: a plain copy of efni sitting inside
	// some other checkout would otherwise report THAT checkout's commit
	const top = git(sourceDir, ['rev-parse', '--show-toplevel']);
	if (top === null || realpathSync(top) !== realpathSync(sourceDir)) return none;

	const commit = git(sourceDir, ['rev-parse', 'HEAD']);
	if (commit === null) return none;

	const branch = git(sourceDir, ['symbolic-ref', '--short', '-q', 'HEAD']) || null;

	let onOriginMain = null;
	if (git(sourceDir, ['rev-parse', '--verify', '-q', 'refs/remotes/origin/main']) !== null) {
		// --is-ancestor answers by exit code: 0 yes, 1 no
		onOriginMain =
			git(sourceDir, ['merge-base', '--is-ancestor', 'HEAD', 'refs/remotes/origin/main']) !== null;
	}

	// Only the book's publication folder counts: that is what was copied
	const status = git(sourceDir, [
		'status',
		'--porcelain',
		'--',
		`books/${bookSlug}/05-publication`
	]);
	const dirty = status === null ? null : status.length > 0;

	return { commit, branch, onOriginMain, dirty };
}

/**
 * @param {object} p
 * @param {string} p.book
 * @param {string[]} p.layers - publication variants copied, baseline first
 * @param {ReturnType<typeof readEfniState>} p.efni
 * @param {string|null} p.vefurCommit - the vefur commit that ran the sync
 * @param {Date} p.now
 */
export function buildSyncStamp({ book, layers, efni, vefurCommit, now }) {
	return { book, syncedAt: now.toISOString(), layers, efni, vefurCommit };
}

/** The vefur commit running this sync, or null. */
export function readVefurCommit(projectRoot) {
	return git(projectRoot, ['rev-parse', 'HEAD']);
}

export function writeSyncStamp(bookDest, stamp) {
	writeFileSync(resolve(bookDest, SYNC_STAMP_FILE), JSON.stringify(stamp, null, 2) + '\n');
}
