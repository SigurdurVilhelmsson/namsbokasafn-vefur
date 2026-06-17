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
import { existsSync, readdirSync, statSync, rmSync, cpSync } from 'fs';
import { resolve, dirname, relative, sep } from 'path';
import { fileURLToPath } from 'url';
import { chapterFullyFaithful, faithfulFileWins } from './lib/overlay.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const destDir = resolve(projectRoot, 'static', 'content');

// Default source: sibling directory
const DEFAULT_SOURCE = resolve(projectRoot, '..', 'namsbokasafn-efni');

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

	cpSync(faithfulPath, bookDest, {
		recursive: true,
		force: true,
		filter: (src) => {
			if (statSync(src).isDirectory()) return true;
			if (isExcludedArtifact(src)) return false;

			const rel = relative(faithfulPath, src).split(sep).join('/');

			// Chapter aggregation pages: only overlay when the chapter is complete.
			const m = rel.match(/^chapters\/(\d{2})\/([^/]+\.html)$/);
			if (m) {
				const [, ch, file] = m;
				return faithfulFileWins(file, chapterComplete.get(ch) !== false);
			}

			// Book-level rollups: only overlay when the whole book is faithful.
			if ((rel === 'glossary.json' || rel === 'index.json') && !bookComplete) {
				return false;
			}

			return true;
		}
	});
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

	// Sync each book
	let success = 0;
	let failed = 0;

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

main();
