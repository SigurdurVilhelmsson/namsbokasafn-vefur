#!/usr/bin/env node
/**
 * Sync content from namsbokasafn-efni repository
 *
 * This script syncs book content from the content preparation repository
 * to the web application's static/content directory.
 *
 * Source structure (namsbokasafn-efni):
 *   books/{bookSlug}/05-publication/faithful/   <- preferred source
 *   books/{bookSlug}/05-publication/mt-preview/ <- fallback source
 *
 * Destination structure (namsbokasafn-vefur):
 *   static/content/{bookSlug}/
 *
 * Usage:
 *   node scripts/sync-content.js                    # Sync all books
 *   node scripts/sync-content.js efnafraedi         # Sync specific book
 *   node scripts/sync-content.js --dry-run          # Preview changes
 *   node scripts/sync-content.js --source ../path   # Custom source path
 *
 * Options:
 *   --dry-run, -n     Preview changes without syncing
 *   --source, -s      Path to content repo (default: ../namsbokasafn-efni)
 *   --validate, -v    Run content validation after sync
 *   --help, -h        Show this help message
 */

import { execSync, spawnSync } from 'child_process';
import { existsSync, readdirSync, statSync, rmSync, cpSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const destDir = resolve(projectRoot, 'static', 'content');

// Default source: sibling directory
const DEFAULT_SOURCE = resolve(projectRoot, '..', 'namsbokasafn-efni');

// Publication variants in priority order
const PUBLICATION_VARIANTS = ['faithful', 'mt-preview'];

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
  node scripts/sync-content.js efnafraedi         Sync specific book
  node scripts/sync-content.js -n                 Preview changes (dry-run)
  node scripts/sync-content.js -v                 Sync and validate
  node scripts/sync-content.js -s ../my-content   Custom source path

Options:
  --dry-run, -n     Preview changes without syncing
  --source, -s      Path to content repo (default: ../namsbokasafn-efni)
  --validate, -v    Run content validation after sync
  --help, -h        Show this help message

Source structure:
  The script looks for publication content in:
    books/{bookSlug}/05-publication/faithful/   (preferred)
    books/{bookSlug}/05-publication/mt-preview/ (fallback)

  Each publication directory must contain a chapters/ directory.
  toc.json is auto-generated after sync based on actual content.
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

// Get the publication source path for a book (faithful preferred, mt-preview fallback)
function getPublicationPath(sourceDir, bookSlug) {
	const bookDir = resolve(sourceDir, 'books', bookSlug, '05-publication');

	for (const variant of PUBLICATION_VARIANTS) {
		const variantPath = resolve(bookDir, variant);
		const chaptersPath = resolve(variantPath, 'chapters');

		// Check that variant has a chapters directory with actual chapter subdirectories
		if (existsSync(variantPath) && existsSync(chaptersPath) && statSync(chaptersPath).isDirectory()) {
			// Check for numbered chapter directories (01/, 02/, etc.)
			const chapterDirs = readdirSync(chaptersPath).filter((name) => {
				const fullPath = resolve(chaptersPath, name);
				return statSync(fullPath).isDirectory() && /^\d{2}$/.test(name);
			});

			if (chapterDirs.length > 0) {
				return { path: variantPath, variant };
			}
		}
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
		// A valid book has a publication variant with toc.json
		return getPublicationPath(sourceDir, name) !== null;
	});
}

// Sync a single book using rsync
function syncBook(sourceDir, bookSlug, dryRun) {
	const publication = getPublicationPath(sourceDir, bookSlug);
	const bookDest = resolve(destDir, bookSlug);

	if (!publication) {
		console.error(`  Error: No publication found for: ${bookSlug}`);
		return false;
	}

	console.log(`  Syncing ${bookSlug} (${publication.variant})...`);

	// Build rsync command
	const rsyncArgs = [
		'-av', // Archive mode, verbose
		'--delete', // Remove files in dest that don't exist in source
		'--exclude', '.DS_Store',
		'--exclude', '*.bak',
		'--exclude', '*~'
	];

	if (dryRun) {
		rsyncArgs.push('--dry-run');
	}

	// Source must end with / to sync contents, not the directory itself
	rsyncArgs.push(`${publication.path}/`);
	rsyncArgs.push(`${bookDest}/`);

	const result = spawnSync('rsync', rsyncArgs, {
		stdio: 'inherit',
		encoding: 'utf-8'
	});

	if (result.status !== 0) {
		console.error(`  Error syncing ${bookSlug}`);
		return false;
	}

	// Regenerate toc.json based on actual content
	if (!dryRun) {
		console.log(`  Regenerating toc.json...`);
		try {
			execSync(`node scripts/generate-toc.js ${bookSlug}`, {
				cwd: projectRoot,
				stdio: 'inherit'
			});
		} catch (error) {
			console.error(`  Warning: Failed to regenerate toc.json: ${error.message}`);
		}
	}

	return true;
}

// Fallback sync using cp (if rsync not available)
function syncBookFallback(sourceDir, bookSlug, dryRun) {
	const publication = getPublicationPath(sourceDir, bookSlug);
	const bookDest = resolve(destDir, bookSlug);

	if (!publication) {
		console.error(`  Error: No publication found for: ${bookSlug}`);
		return false;
	}

	if (dryRun) {
		console.log(`  [DRY-RUN] Would sync ${bookSlug} (${publication.variant}):`);
		console.log(`    From: ${publication.path}`);
		console.log(`    To:   ${bookDest}`);
		return true;
	}

	console.log(`  Syncing ${bookSlug} (${publication.variant})...`);

	try {
		// Safety: verify bookDest is inside the expected destination directory
		const resolvedDest = resolve(bookDest);
		const resolvedDestDir = resolve(destDir);
		if (!resolvedDest.startsWith(resolvedDestDir + '/')) {
			console.error(`  Error: destination path is outside content directory: ${resolvedDest}`);
			return false;
		}

		// Remove existing destination
		if (existsSync(bookDest)) {
			rmSync(bookDest, { recursive: true, force: true });
		}

		// Copy source to destination
		cpSync(publication.path, bookDest, { recursive: true });

		// Regenerate toc.json based on actual content
		console.log(`  Regenerating toc.json...`);
		try {
			execSync(`node scripts/generate-toc.js ${bookSlug}`, {
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
		console.error('Expected structure: books/{bookSlug}/05-publication/{faithful|mt-preview}/toc.json');
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

	process.exit(failed > 0 ? 1 : 0);
}

main();
