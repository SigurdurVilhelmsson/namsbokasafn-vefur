/**
 * Editor and working artifacts that must never reach published content.
 *
 * ONE list for both rsync calls that publish content, so the two cannot drift:
 *   - scripts/sync-content.js excludes them when copying efni's content into
 *     static/content (with --delete-excluded, so it also clears old ones there).
 *   - scripts/deploy-excludes.js keeps them out of the deploy, because a build
 *     copies whatever static/content still holds into build/ — on 2026-10-01 the
 *     dev machine's static/content held 9,639 such files.
 *
 * Each entry is an rsync pattern.
 */
export const EDITOR_ARTIFACT_PATTERNS = Object.freeze([
	'.DS_Store',
	'*.bak',
	'*~',
	'*.backup.*', // e.g. 1-summary.html.backup.2026-06-16T14-48-50
	'*.pre-fix-*', // e.g. 21-2-kjarnajofnur.html.pre-fix-20260418T135933
	'*.orig'
]);
