#!/usr/bin/env node
/**
 * Sync content from namsbokasafn-efni repository
 *
 * This script syncs book content from the content preparation repository
 * to the web application's static/content directory.
 *
 * Source structure (namsbokasafn-efni):
 *   books/{bookSlug}/05-publication/mt-preview/ <- complete baseline (machine-translated)
 *   books/{bookSlug}/05-publication/faithful/   <- reviewed overlay (replaces modules as completed)
 *
 * mt-preview is mirrored first (with --delete); faithful is then copied on top
 * WITHOUT --delete, so a partial reviewed translation never wipes baseline
 * chapters. generate-toc.js marks each module `reviewed: true` when a faithful
 * version exists, which drives the machine-translation banner in the reader.
 *
 * Destination structure (namsbokasafn-vefur):
 *   static/content/{bookSlug}/
 *
 * Usage:
 *   node scripts/sync-content.js                    # Sync all books
 *   node scripts/sync-content.js efnafraedi-2e        # Sync specific book
 *   node scripts/sync-content.js --dry-run          # Preview changes
 *   node scripts/sync-content.js --source ../path   # Custom source path
 *
 * Options:
 *   --dry-run, -n     Preview changes without syncing
 *   --source, -s      Path to content repo (default: ../namsbokasafn-efni)
 *   --validate, -v    Run content validation after sync
 *   --help, -h        Show this help message
 */

import { execFileSync, execSync, spawnSync } from 'child_process';
import { existsSync, readdirSync, statSync, rmSync, cpSync, mkdirSync } from 'fs';
import { resolve, dirname, relative, sep } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import {
	chapterFullyFaithful,
	faithfulFileWins,
	faithfulRollupsComplete,
	resolveChapterDuplicates,
	resetIdentityCache,
	ROLLUPS_COMPLETE_MARKER
} from './lib/overlay.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const destDir = resolve(projectRoot, 'static', 'content');

// Default source: sibling directory
const DEFAULT_SOURCE = resolve(projectRoot, '..', 'namsbokasafn-efni');

// Running total of unresolved duplicate-module conflicts (see
// pruneSupersededFiles) across every book synced in this run. Read by main()
// to print an end-of-run summary — the per-book ⚠️ warning alone is easy to
// miss in a long CI log. Reset at the start of each sync run.
let unresolvedConflicts = 0;

// Parse command line arguments
function parseArgs(args) {
	const options = {
		dryRun: false,
		validate: false,
		source: DEFAULT_SOURCE,
		books: [],
		help: false
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg === '--help' || arg === '-h') {
			options.help = true;
		} else if (arg === '--dry-run' || arg === '-n') {
			options.dryRun = true;
		} else if (arg === '--validate' || arg === '-v') {
			options.validate = true;
		} else if (arg === '--source' || arg === '-s') {
			options.source = resolve(args[++i] || DEFAULT_SOURCE);
		} else if (!arg.startsWith('-')) {
			options.books.push(arg);
		}
	}

	return options;
}

function showHelp() {
	console.log(`
Sync content from namsbokasafn-efni repository

Usage:
  node scripts/sync-content.js [options] [book...]

Examples:
  node scripts/sync-content.js                    Sync all books
  node scripts/sync-content.js efnafraedi-2e        Sync specific book
  node scripts/sync-content.js -n                 Preview changes (dry-run)
  node scripts/sync-content.js -v                 Sync and validate
  node scripts/sync-content.js -s ../my-content   Custom source path

Options:
  --dry-run, -n     Preview changes without syncing
  --source, -s      Path to content repo (default: ../namsbokasafn-efni)
  --validate, -v    Run content validation after sync
  --help, -h        Show this help message

Source structure:
  The script merges two publication variants:
    books/{bookSlug}/05-publication/mt-preview/ (complete baseline)
    books/{bookSlug}/05-publication/faithful/   (reviewed overlay, copied on top)

  Each publication directory must contain a chapters/ directory.
  toc.json is auto-generated after sync based on actual content; modules with a
  faithful version are marked reviewed (no machine-translation banner).
`);
}

// Check if rsync is available
function hasRsync() {
	try {
		execSync('which rsync', { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
}

// Check that a variant directory has a chapters/ dir with numbered chapter
// subdirectories (01/, 02/, …). Returns its absolute path, or null.
function variantWithChapters(bookDir, variant) {
	const variantPath = resolve(bookDir, variant);
	const chaptersPath = resolve(variantPath, 'chapters');

	if (existsSync(variantPath) && existsSync(chaptersPath) && statSync(chaptersPath).isDirectory()) {
		const chapterDirs = readdirSync(chaptersPath).filter((name) => {
			const fullPath = resolve(chaptersPath, name);
			return statSync(fullPath).isDirectory() && /^\d{2}$/.test(name);
		});
		if (chapterDirs.length > 0) {
			return variantPath;
		}
	}

	return null;
}

// Resolve the publication layers for a book.
//
// The complete machine-translated `mt-preview` is the BASELINE; the
// human-reviewed `faithful` is an OVERLAY that replaces individual modules as
// they are completed. The sync mirrors the baseline (with --delete) and then
// copies the overlay on top WITHOUT --delete, so a partial `faithful` can
// never wipe chapters that only exist in `mt-preview`.
//
// Falls back gracefully: a book with only one variant uses that variant as the
// baseline (no overlay). Returns null if neither variant has chapters.
function getPublicationLayers(sourceDir, bookSlug) {
	const bookDir = resolve(sourceDir, 'books', bookSlug, '05-publication');

	const mtPath = variantWithChapters(bookDir, 'mt-preview');
	const faithfulPath = variantWithChapters(bookDir, 'faithful');

	if (mtPath && faithfulPath) {
		return {
			baseline: { path: mtPath, variant: 'mt-preview' },
			overlay: { path: faithfulPath, variant: 'faithful' }
		};
	}
	if (mtPath) {
		return { baseline: { path: mtPath, variant: 'mt-preview' }, overlay: null };
	}
	if (faithfulPath) {
		return { baseline: { path: faithfulPath, variant: 'faithful' }, overlay: null };
	}

	return null;
}

// Get list of books in source directory
function getSourceBooks(sourceDir) {
	const booksDir = resolve(sourceDir, 'books');

	if (!existsSync(booksDir)) {
		return [];
	}

	return readdirSync(booksDir).filter((name) => {
		const path = resolve(booksDir, name);
		if (!statSync(path).isDirectory()) {
			return false;
		}
		// A valid book has at least one publication variant with chapters
		return getPublicationLayers(sourceDir, name) !== null;
	});
}

// Editor/working artifacts that must never reach published content.
const SYNC_EXCLUDES = [
	'--exclude', '.DS_Store',
	'--exclude', '*.bak',
	'--exclude', '*~',
	'--exclude', '*.backup.*', // e.g. 1-summary.html.backup.2026-06-16T14-48-50
	'--exclude', '*.pre-fix-*', // e.g. 21-2-kjarnajofnur.html.pre-fix-20260418T135933
	'--exclude', '*.orig'
];

// Sync a single book using rsync: mirror the baseline, then overlay reviewed
// modules on top (without --delete) so a partial overlay can't remove baseline
// chapters.
function syncBook(sourceDir, bookSlug, dryRun) {
	const layers = getPublicationLayers(sourceDir, bookSlug);
	const bookDest = resolve(destDir, bookSlug);

	if (!layers) {
		console.error(`  Error: No publication found for: ${bookSlug}`);
		return false;
	}

	const label = layers.overlay
		? `${layers.baseline.variant} + ${layers.overlay.variant} overlay`
		: layers.baseline.variant;
	console.log(`  Syncing ${bookSlug} (${label})...`);

	// 1. Baseline — mirror with --delete so dest matches the complete source.
	const baseArgs = ['-av', '--delete', ...SYNC_EXCLUDES];
	if (dryRun) baseArgs.push('--dry-run');
	// Source must end with / to sync contents, not the directory itself
	baseArgs.push(`${layers.baseline.path}/`, `${bookDest}/`);

	let result = spawnSync('rsync', baseArgs, { stdio: 'inherit', encoding: 'utf-8' });
	if (result.status !== 0) {
		console.error(`  Error syncing ${bookSlug} (baseline)`);
		return false;
	}

	// 2. Overlay reviewed modules on top of the baseline (no deletion), gating
	// chapter-level aggregation pages so a partial faithful chapter can't
	// replace the complete mt-preview rollup. (cpSync, not rsync, so the
	// per-file gating logic lives in one place for both sync paths.)
	if (layers.overlay && !dryRun) {
		overlayFaithful(layers.overlay.path, layers.baseline.path, bookDest);
	}

	// 3. Drop baseline pages the overlay republished under a new filename, and
	// report duplicates it cannot adjudicate. Runs before toc regeneration so
	// the TOC is always generated from a pruned destination.
	//
	// Wrapped in try/catch (mirroring syncBookFallback's own try/catch below)
	// so a filesystem error here (permissions, full disk, a concurrent edit)
	// fails only this book. Without it, an uncaught throw here would escape
	// syncBook entirely — main()'s loop has no enclosing try either — killing
	// the whole process and leaving every remaining book unsynced.
	if (!dryRun) {
		try {
			unresolvedConflicts += pruneSupersededFiles(bookDest, layers.overlay?.path ?? null, bookSlug);
		} catch (error) {
			console.error(`  Error pruning superseded pages for ${bookSlug}: ${error.message}`);
			return false;
		}
	}

	// Regenerate toc.json based on actual content
	if (!dryRun) {
		console.log(`  Regenerating toc.json...`);
		try {
			// execFileSync (not execSync) so the slug is passed as an argument,
			// never interpreted by a shell
			execFileSync('node', ['scripts/generate-toc.js', bookSlug], {
				cwd: projectRoot,
				stdio: 'inherit'
			});
		} catch (error) {
			console.error(`  Warning: Failed to regenerate toc.json: ${error.message}`);
		}
	}

	return true;
}

// True if a path is an editor/working artifact that must not be published.
function isExcludedArtifact(path) {
	const name = path.split('/').pop() || '';
	return (
		name === '.DS_Store' ||
		name.endsWith('.bak') ||
		name.endsWith('~') ||
		name.endsWith('.orig') ||
		name.includes('.backup.') ||
		name.includes('.pre-fix-')
	);
}

// Overlay the faithful tree on top of the already-synced baseline in bookDest.
// Reading modules replace their mt-preview counterparts per-file; chapter
// aggregation pages (summary/key-terms/exercises/answer-key) are only taken
// from faithful when the WHOLE chapter is faithful, so a partial review can't
// clobber the complete mt-preview rollup. Book-level rollups (glossary.json,
// index.json) likewise only overlay when every chapter is faithful.
function overlayFaithful(faithfulPath, mtPath, bookDest) {
	const faithfulChapters = resolve(faithfulPath, 'chapters');
	const mtChapters = resolve(mtPath, 'chapters');

	// Precompute per-chapter completeness once.
	const chapterComplete = new Map();
	if (existsSync(faithfulChapters)) {
		for (const ch of readdirSync(faithfulChapters)) {
			const chPath = resolve(faithfulChapters, ch);
			if (statSync(chPath).isDirectory() && /^\d{2}$/.test(ch)) {
				chapterComplete.set(ch, chapterFullyFaithful(faithfulChapters, mtChapters, ch));
			}
		}
	}

	// The book is fully faithful only if every mt-preview chapter is complete.
	const bookComplete =
		existsSync(mtChapters) &&
		readdirSync(mtChapters)
			.filter((d) => /^\d{2}$/.test(d) && statSync(resolve(mtChapters, d)).isDirectory())
			.every((ch) => chapterComplete.get(ch) === true);

	// When efni signals its faithful rollups are built complete (faithful +
	// MT fallback), serve them regardless of per-chapter review state.
	const rollupsComplete = faithfulRollupsComplete(faithfulPath);

	cpSync(faithfulPath, bookDest, {
		recursive: true,
		force: true,
		filter: (src) => {
			if (statSync(src).isDirectory()) return true;
			if (isExcludedArtifact(src)) return false;

			const rel = relative(faithfulPath, src).split(sep).join('/');

			// The completeness marker is metadata — never publish it.
			if (rel === ROLLUPS_COMPLETE_MARKER) return false;

			// Chapter aggregation pages: overlay when the chapter is fully
			// faithful, or when efni signals complete rollups.
			const m = rel.match(/^chapters\/(\d{2})\/([^/]+\.html)$/);
			if (m) {
				const [, ch, file] = m;
				const aggregationAllowed = rollupsComplete || chapterComplete.get(ch) !== false;
				return faithfulFileWins(file, aggregationAllowed);
			}

			// Book-level rollups: overlay when the whole book is faithful, or
			// when efni signals complete rollups.
			if ((rel === 'glossary.json' || rel === 'index.json') && !(bookComplete || rollupsComplete)) {
				return false;
			}

			return true;
		}
	});
}

/**
 * Remove baseline pages that the faithful overlay republished under a new
 * filename, and report duplicates the overlay cannot adjudicate.
 *
 * A section's filename is derived from its title, so a review that corrects a
 * title renames the rendered file. The overlay is copied WITHOUT --delete (so a
 * partial review can never wipe baseline chapters), which means a rename ADDS
 * the new name instead of replacing the old one — and the module gets published
 * twice, once under the corrected title and once under the stale one.
 *
 * Runs whether or not the book has an overlay: a stale render left behind in
 * mt-preview produces the same duplicate with no faithful file in sight. That
 * case is a CONTENT defect, not a vefur one — vefur has no basis to choose
 * between two translations, so it warns and keeps both.
 *
 * @param bookDest      static/content/<book>
 * @param faithfulPath  the faithful publication dir (holding chapters/), or null
 * @param bookSlug      for the warning message
 * @returns {number}    unresolved conflicts reported
 */
export function pruneSupersededFiles(bookDest, faithfulPath, bookSlug) {
	const chaptersDest = resolve(bookDest, 'chapters');
	if (!existsSync(chaptersDest)) return 0;

	let conflictCount = 0;
	let removed = 0;

	// Every direct subdirectory holds pages: numbered chapters, front matter
	// (00) and the appendix dir (appendices/). Images live one level deeper,
	// inside a chapter dir.
	for (const dirName of readdirSync(chaptersDest).sort()) {
		const dir = resolve(chaptersDest, dirName);
		if (!statSync(dir).isDirectory()) continue;

		const faithfulDir = faithfulPath ? resolve(faithfulPath, 'chapters', dirName) : null;
		const { superseded, conflicts } = resolveChapterDuplicates(dir, faithfulDir);

		for (const file of superseded) {
			// force: true so a file that vanished between readdirSync and here
			// (e.g. removed by a concurrent run) no-ops instead of throwing —
			// leaving the try/catch at each call site to catch failures that
			// actually deserve a failed book (permissions, full disk, etc.).
			rmSync(resolve(dir, file), { force: true });
			removed++;
			console.log(`    Removed superseded page (reviewed rename): chapters/${dirName}/${file}`);
		}

		for (const { identity, files } of conflicts) {
			conflictCount++;
			console.warn(
				`\n  ⚠️  DUPLICATE MODULE — ${bookSlug} chapters/${dirName} (${identity})\n` +
					files.map((f) => `        ${f}`).join('\n') +
					`\n      One module, two published pages, and no reviewed version to choose between them.` +
					`\n      Both were kept. Fix at the source in namsbokasafn-efni: prune the stale render.\n`
			);
		}
	}

	// The index memo predates these deletions.
	if (removed > 0) resetIdentityCache();

	return conflictCount;
}

// Fallback sync using cp (if rsync not available). Mirrors the rsync path:
// copy the baseline, then overlay reviewed modules on top.
function syncBookFallback(sourceDir, bookSlug, dryRun) {
	const layers = getPublicationLayers(sourceDir, bookSlug);
	const bookDest = resolve(destDir, bookSlug);

	if (!layers) {
		console.error(`  Error: No publication found for: ${bookSlug}`);
		return false;
	}

	const label = layers.overlay
		? `${layers.baseline.variant} + ${layers.overlay.variant} overlay`
		: layers.baseline.variant;

	if (dryRun) {
		console.log(`  [DRY-RUN] Would sync ${bookSlug} (${label}):`);
		console.log(`    Baseline: ${layers.baseline.path}`);
		if (layers.overlay) console.log(`    Overlay:  ${layers.overlay.path}`);
		console.log(`    To:       ${bookDest}`);
		return true;
	}

	console.log(`  Syncing ${bookSlug} (${label})...`);

	try {
		// Safety: verify bookDest is inside the expected destination directory
		const resolvedDest = resolve(bookDest);
		const resolvedDestDir = resolve(destDir);
		if (!resolvedDest.startsWith(resolvedDestDir + '/')) {
			console.error(`  Error: destination path is outside content directory: ${resolvedDest}`);
			return false;
		}

		const copyOpts = { recursive: true, force: true, filter: (src) => !isExcludedArtifact(src) };

		// Remove existing destination, then copy the baseline fresh
		if (existsSync(bookDest)) {
			rmSync(bookDest, { recursive: true, force: true });
		}
		cpSync(layers.baseline.path, bookDest, copyOpts);

		// Overlay reviewed modules on top, gating chapter aggregation pages
		if (layers.overlay) {
			overlayFaithful(layers.overlay.path, layers.baseline.path, bookDest);
		}

		// Drop baseline pages the overlay republished under a new filename.
		// Already inside this function's own try/catch, so a throw here is
		// reported as a failed sync for this book without killing the process.
		unresolvedConflicts += pruneSupersededFiles(bookDest, layers.overlay?.path ?? null, bookSlug);

		// Regenerate toc.json based on actual content
		console.log(`  Regenerating toc.json...`);
		try {
			// execFileSync (not execSync) so the slug is passed as an argument,
			// never interpreted by a shell
			execFileSync('node', ['scripts/generate-toc.js', bookSlug], {
				cwd: projectRoot,
				stdio: 'inherit'
			});
		} catch (error) {
			console.error(`  Warning: Failed to regenerate toc.json: ${error.message}`);
		}

		console.log(`    Done.`);
		return true;
	} catch (error) {
		console.error(`  Error syncing ${bookSlug}: ${error.message}`);
		return false;
	}
}

/**
 * Sync the public-facing licence/provenance summary from efni so the colophon
 * page (/[book]/leyfi) and BookAttribution can link to a served copy. Single
 * source of truth lives in efni docs/provenance/provenance.md; the destination
 * (static/provenance/) is gitignored, like static/content.
 */
function syncProvenance(sourceDir, dryRun) {
	const src = resolve(sourceDir, 'docs', 'provenance', 'provenance.md');
	const destProvenanceDir = resolve(projectRoot, 'static', 'provenance');
	const dest = resolve(destProvenanceDir, 'provenance.md');

	if (!existsSync(src)) {
		console.warn(`\nWarning: provenance summary not found at ${src} — colophon link will 404.`);
		return;
	}

	if (dryRun) {
		console.log(`\n[DRY-RUN] Would sync provenance summary:\n    ${src}\n    To: ${dest}`);
		return;
	}

	console.log('\nSyncing provenance summary...');
	mkdirSync(destProvenanceDir, { recursive: true });
	cpSync(src, dest);
	console.log(`  Done: ${dest}`);
}

function main() {
	if (process.getuid?.() === 0) {
		console.error('Error: Do not run this script as root (sudo).');
		console.error('The build process needs to write to files created by this script.');
		console.error('Run as your normal user instead: node scripts/sync-content.js');
		process.exit(1);
	}

	const args = process.argv.slice(2);
	const options = parseArgs(args);

	if (options.help) {
		showHelp();
		process.exit(0);
	}

	console.log('Content Sync');
	console.log('============\n');

	// Check source directory
	if (!existsSync(options.source)) {
		console.error(`Error: Source directory not found: ${options.source}`);
		console.error('\nMake sure the content repository exists at the expected location.');
		console.error('Use --source to specify a different path.\n');
		process.exit(1);
	}

	const booksDir = resolve(options.source, 'books');
	if (!existsSync(booksDir)) {
		console.error(`Error: No 'books' directory found in: ${options.source}`);
		console.error('Expected structure: {source}/books/{bookSlug}/05-publication/...');
		process.exit(1);
	}

	console.log(`Source: ${options.source}`);
	console.log(`Dest:   ${destDir}`);

	if (options.dryRun) {
		console.log('\n[DRY-RUN MODE - no changes will be made]\n');
	} else {
		console.log('');
	}

	// Determine which books to sync
	const availableBooks = getSourceBooks(options.source);

	if (availableBooks.length === 0) {
		console.error('No valid books found in source directory.');
		console.error('Expected structure: books/{bookSlug}/05-publication/{mt-preview|faithful}/chapters/');
		process.exit(1);
	}

	let booksToSync = options.books.length > 0 ? options.books : availableBooks;

	// Validate requested books exist
	const invalidBooks = booksToSync.filter((b) => !availableBooks.includes(b));
	if (invalidBooks.length > 0) {
		console.error(`Error: Books not found in source: ${invalidBooks.join(', ')}`);
		console.error(`Available books: ${availableBooks.join(', ')}`);
		process.exit(1);
	}

	console.log(`Books to sync: ${booksToSync.join(', ')}\n`);

	// Check for rsync
	const useRsync = hasRsync();
	if (!useRsync) {
		console.log('Note: rsync not found, using cp fallback (less efficient)\n');
	}

	// Ensure the destination root exists. static/content/ is gitignored, so on a
	// fresh clone it does not exist — and rsync cannot create
	// static/content/<book> when its parent is missing. Without this, every book
	// fails with "mkdir ... No such file or directory" and the documented setup
	// path (clone → npm install → sync-content) does not work at all.
	if (!options.dryRun) {
		mkdirSync(destDir, { recursive: true });
	}

	// Sync each book
	let success = 0;
	let failed = 0;
	unresolvedConflicts = 0;

	for (const bookSlug of booksToSync) {
		const result = useRsync
			? syncBook(options.source, bookSlug, options.dryRun)
			: syncBookFallback(options.source, bookSlug, options.dryRun);

		if (result) {
			success++;
		} else {
			failed++;
		}
	}

	// Clean up stale content directories no longer present in source
	if (existsSync(destDir)) {
		const existingContentDirs = readdirSync(destDir).filter((name) => {
			const fullPath = resolve(destDir, name);
			return statSync(fullPath).isDirectory();
		});

		const staleDirs = existingContentDirs.filter((dir) => !availableBooks.includes(dir));

		if (staleDirs.length > 0) {
			console.log('\nCleaning up stale content directories...');
			for (const stale of staleDirs) {
				if (options.dryRun) {
					console.log(`  [DRY-RUN] Would remove stale content: ${stale}/`);
				} else {
					console.log(`  Removing stale content: ${stale}/`);
					rmSync(resolve(destDir, stale), { recursive: true, force: true });
				}
			}
		}
	}

	console.log(`\nSync complete: ${success} succeeded, ${failed} failed`);

	// Surface unresolved duplicate-module conflicts at the end of the run too —
	// the per-book ⚠️  DUPLICATE MODULE warning above is easy to miss in a long
	// CI log. Not a sync failure: a duplicate is a content defect to fix at the
	// source in namsbokasafn-efni, not something vefur can adjudicate, so this
	// does not affect the exit code.
	if (unresolvedConflicts > 0) {
		console.warn(
			`\n⚠️  ${unresolvedConflicts} unresolved duplicate module${unresolvedConflicts === 1 ? '' : 's'} — see the DUPLICATE MODULE warning(s) above. Fix at the source in namsbokasafn-efni.`
		);
	}

	// Sync the public-facing provenance summary (independent of per-book results).
	syncProvenance(options.source, options.dryRun);

	// Run validation if requested
	if (options.validate && !options.dryRun && failed === 0) {
		console.log('\nRunning content validation...\n');
		try {
			execSync('npm run lint-content', {
				cwd: projectRoot,
				stdio: 'inherit'
			});
		} catch {
			console.error('\nValidation failed. Please fix the issues above.');
			process.exit(1);
		}
	}

	// Always run the post-sync content audit (non-blocking report).
	// Flags defect patterns in synced HTML so regressions are caught before deploy.
	if (!options.dryRun && failed === 0) {
		console.log('\nRunning post-sync content audit...\n');
		try {
			execSync('node scripts/audit-content.js', {
				cwd: projectRoot,
				stdio: 'inherit'
			});
		} catch (err) {
			console.error('\nAudit script errored (non-blocking):', err.message);
		}
	}

	process.exit(failed > 0 ? 1 : 0);
}

// Only run as a CLI — importing this module (tests) must not start a sync.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	main();
}
