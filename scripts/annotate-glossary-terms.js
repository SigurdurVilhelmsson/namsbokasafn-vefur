#!/usr/bin/env node
/**
 * Annotate glossary terms with data-term attributes
 *
 * Post-processes existing HTML files to add data-term="base-form" attributes
 * to <dfn class="term"> elements. This bridges the gap between inflected
 * Icelandic inline terms and their base/nominative forms in glossary.json.
 *
 * Matching strategy (three tiers):
 * 1. English fallback: extract "(e. ...)" suffix, match to glossary english field
 * 2. Icelandic exact: match stripped Icelandic text to glossary term field
 * 3. Skip if already has data-term attribute
 *
 * Usage:
 *   node scripts/annotate-glossary-terms.js                  # Annotate all books
 *   node scripts/annotate-glossary-terms.js efnafraedi-2e      # Specific book
 *   node scripts/annotate-glossary-terms.js --dry-run        # Preview without writing
 *   node scripts/annotate-glossary-terms.js --verbose        # Show each match
 */

import { existsSync, readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { resolve, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const contentDir = resolve(projectRoot, 'static', 'content');

function parseArgs(args) {
	const options = {
		dryRun: false,
		verbose: false,
		books: [],
		help: false
	};

	for (const arg of args) {
		if (arg === '--dry-run') options.dryRun = true;
		else if (arg === '--verbose') options.verbose = true;
		else if (arg === '--help' || arg === '-h') options.help = true;
		else if (!arg.startsWith('-')) options.books.push(arg);
	}

	return options;
}

/**
 * Split a composite term like "SI-einingar (Alþjóðlega einingakerfið)" into parts.
 * Returns all parts: the full string, and each piece split by parentheses.
 */
function splitCompositeParts(text) {
	const parts = [];
	// Match "prefix (suffix)" pattern
	const parenMatch = text.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
	if (parenMatch) {
		parts.push(parenMatch[1].trim());
		parts.push(parenMatch[2].trim());
	}
	return parts;
}

/**
 * Singularize a common English plural form.
 * Handles the most common patterns; not a full morphological analyzer.
 */
/**
 * Singularize a common English plural form.
 * Returns an array of candidates (may include multiple for ambiguous cases).
 */
function singularize(word) {
	const lower = word.toLowerCase();
	if (lower.length <= 3) return [];

	const candidates = [];

	// -ies → -y (e.g., "theories" → "theory")
	if (/[^aeiou]ies$/i.test(word)) {
		candidates.push(word.slice(0, -3) + 'y');
	}

	// -ses, -xes, -zes, -ches, -shes → drop -es, and also try drop -s
	// ("bases" → "base" via -s, "gases" → "gas" via -es)
	if (/(?:s|x|z|ch|sh)es$/i.test(word)) {
		candidates.push(word.slice(0, -2)); // gas, match, etc.
		candidates.push(word.slice(0, -1)); // base, etc.
	}

	// Generic -s → drop -s (but not -ss like "mass")
	if (candidates.length === 0 && /[^s]s$/i.test(word)) {
		candidates.push(word.slice(0, -1));
	}

	return candidates;
}

/**
 * Strip inner parentheticals from extracted English text.
 * e.g., "alpha particles (α particles)" → "alpha particles"
 */
function stripInnerParenthetical(text) {
	return text.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
}

/**
 * Load glossary.json and build lookup maps
 */
function buildGlossaryMaps(glossaryPath) {
	const raw = readFileSync(glossaryPath, 'utf-8');
	const glossary = JSON.parse(raw);
	const terms = glossary.terms || [];

	// Map from lowercase Icelandic base form to term object
	const icelandicMap = new Map();
	// Map from lowercase English to term object
	const englishMap = new Map();

	for (const term of terms) {
		const icKey = term.term.toLowerCase();
		if (!icelandicMap.has(icKey)) {
			icelandicMap.set(icKey, term);
		}

		// Also index composite Icelandic parts
		for (const part of splitCompositeParts(term.term)) {
			const partKey = part.toLowerCase();
			if (!icelandicMap.has(partKey)) {
				icelandicMap.set(partKey, term);
			}
		}

		if (term.english) {
			const enKey = term.english.toLowerCase();
			if (!englishMap.has(enKey)) {
				englishMap.set(enKey, term);
			}

			// Also index composite English parts
			for (const part of splitCompositeParts(term.english)) {
				const partKey = part.toLowerCase();
				if (!englishMap.has(partKey)) {
					englishMap.set(partKey, term);
				}
			}
		}

		// Index alternate English forms
		if (term.alternateEnglish) {
			for (const alt of term.alternateEnglish) {
				const altKey = alt.toLowerCase();
				if (!englishMap.has(altKey)) {
					englishMap.set(altKey, term);
				}
			}
		}
	}

	return { icelandicMap, englishMap, termCount: terms.length };
}

/**
 * Extract English term from text containing "(e. ...)" suffix
 */
function extractEnglish(text) {
	const marker = ' (e. ';
	const idx = text.lastIndexOf(marker);
	if (idx === -1) return null;
	const english = text.substring(idx + marker.length).replace(/\)\s*$/, '').trim();
	return english || null;
}

/**
 * Strip the "(e. ...)" English suffix to get the Icelandic term text
 */
function stripEnglishSuffix(text) {
	const marker = ' (e. ';
	const idx = text.lastIndexOf(marker);
	return idx !== -1 ? text.substring(0, idx).trim() : text;
}

/**
 * Process a single HTML file: find <dfn class="term"> elements and add data-term
 */
function processFile(filePath, icelandicMap, englishMap, options) {
	const content = readFileSync(filePath, 'utf-8');
	const relPath = relative(projectRoot, filePath);

	// Match <dfn class="term" ...>...</dfn> — capture attributes and inner text
	const dfnRegex = /<dfn\s+class="term"([^>]*)>(.*?)<\/dfn>/gs;

	let modified = content;
	let matchCount = 0;
	let alreadyAnnotated = 0;
	let matched = 0;
	let unmatched = 0;
	const unmatchedTerms = [];

	// Collect all replacements first to avoid offset issues
	const replacements = [];

	let match;
	while ((match = dfnRegex.exec(content)) !== null) {
		matchCount++;
		const [fullMatch, existingAttrs, innerHtml] = match;

		// Skip if already has data-term
		if (existingAttrs.includes('data-term')) {
			alreadyAnnotated++;
			continue;
		}

		// Get plain text from inner HTML (strip tags)
		const plainText = innerHtml.replace(/<[^>]+>/g, '').trim();

		// Try matching
		let glossaryTerm = null;

		// Tier 1: English match (higher priority since Icelandic is often inflected)
		const english = extractEnglish(plainText);
		if (english) {
			const enLower = english.toLowerCase();
			glossaryTerm = englishMap.get(enLower);

			// Tier 1b: Strip inner parentheticals, e.g. "alpha particles (α particles)" → "alpha particles"
			if (!glossaryTerm) {
				const stripped = stripInnerParenthetical(enLower);
				if (stripped !== enLower) {
					glossaryTerm = englishMap.get(stripped);
					// Also try singularizing the stripped form
					if (!glossaryTerm) {
						for (const s of singularize(stripped)) {
							glossaryTerm = englishMap.get(s.toLowerCase());
							if (glossaryTerm) break;
						}
					}
				}
			}

			// Tier 1c: Singularize English, e.g. "units" → "unit", "compounds" → "compound"
			if (!glossaryTerm) {
				for (const s of singularize(enLower)) {
					glossaryTerm = englishMap.get(s.toLowerCase());
					if (glossaryTerm) break;
				}
			}
		}

		// Tier 2: Icelandic exact match
		if (!glossaryTerm) {
			const icelandicText = stripEnglishSuffix(plainText);
			glossaryTerm = icelandicMap.get(icelandicText.toLowerCase());
		}

		if (glossaryTerm) {
			matched++;
			const replacement = `<dfn class="term" data-term="${glossaryTerm.term}"${existingAttrs}>${innerHtml}</dfn>`;
			replacements.push({ original: fullMatch, replacement });

			if (options.verbose) {
				console.log(`  + ${relPath}: "${plainText}" -> data-term="${glossaryTerm.term}"`);
			}
		} else {
			unmatched++;
			unmatchedTerms.push(plainText);
			if (options.verbose) {
				console.log(`  ? ${relPath}: "${plainText}" (no match)`);
			}
		}
	}

	// Apply replacements
	if (replacements.length > 0 && !options.dryRun) {
		for (const { original, replacement } of replacements) {
			modified = modified.replace(original, replacement);
		}
		writeFileSync(filePath, modified, 'utf-8');
	}

	return { matchCount, alreadyAnnotated, matched, unmatched, unmatchedTerms };
}

/**
 * Recursively find all .html files in a directory
 */
function findHtmlFiles(dir) {
	const results = [];
	if (!existsSync(dir)) return results;

	const entries = readdirSync(dir);
	for (const entry of entries) {
		const fullPath = resolve(dir, entry);
		const stat = statSync(fullPath);
		if (stat.isDirectory()) {
			results.push(...findHtmlFiles(fullPath));
		} else if (entry.endsWith('.html')) {
			results.push(fullPath);
		}
	}
	return results;
}

function main() {
	const options = parseArgs(process.argv.slice(2));

	if (options.help) {
		console.log(`Usage: node scripts/annotate-glossary-terms.js [options] [book...]

Options:
  --dry-run    Preview changes without writing files
  --verbose    Show each term match/miss
  --help, -h   Show this help message

Examples:
  node scripts/annotate-glossary-terms.js                  # All books
  node scripts/annotate-glossary-terms.js efnafraedi-2e      # Specific book
  node scripts/annotate-glossary-terms.js --dry-run        # Preview mode`);
		process.exit(0);
	}

	if (options.dryRun) {
		console.log('[DRY RUN] No files will be modified.\n');
	}

	// Find books to process
	let books = options.books;
	if (books.length === 0) {
		books = readdirSync(contentDir).filter((entry) => {
			const fullPath = resolve(contentDir, entry);
			return statSync(fullPath).isDirectory() && existsSync(resolve(fullPath, 'glossary.json'));
		});
	}

	if (books.length === 0) {
		console.error('No books found in', contentDir);
		process.exit(1);
	}

	let totalFiles = 0;
	let totalDfn = 0;
	let totalMatched = 0;
	let totalUnmatched = 0;
	let totalAlreadyAnnotated = 0;
	const allUnmatched = [];

	for (const book of books) {
		const bookDir = resolve(contentDir, book);
		const glossaryPath = resolve(bookDir, 'glossary.json');

		if (!existsSync(glossaryPath)) {
			console.warn(`Skipping ${book}: no glossary.json found`);
			continue;
		}

		console.log(`Processing book: ${book}`);
		const { icelandicMap, englishMap, termCount } = buildGlossaryMaps(glossaryPath);
		console.log(`  Glossary: ${termCount} terms (${icelandicMap.size} Icelandic, ${englishMap.size} English keys)`);

		const chaptersDir = resolve(bookDir, 'chapters');
		const htmlFiles = findHtmlFiles(chaptersDir);
		console.log(`  HTML files: ${htmlFiles.length}`);

		let bookMatched = 0;
		let bookUnmatched = 0;
		let bookDfn = 0;
		let bookAlreadyAnnotated = 0;

		for (const file of htmlFiles) {
			const result = processFile(file, icelandicMap, englishMap, options);
			totalFiles++;
			bookDfn += result.matchCount;
			bookMatched += result.matched;
			bookUnmatched += result.unmatched;
			bookAlreadyAnnotated += result.alreadyAnnotated;
			allUnmatched.push(...result.unmatchedTerms);
		}

		totalDfn += bookDfn;
		totalMatched += bookMatched;
		totalUnmatched += bookUnmatched;
		totalAlreadyAnnotated += bookAlreadyAnnotated;

		console.log(`  Results: ${bookDfn} <dfn> elements found`);
		console.log(`    Annotated: ${bookMatched}`);
		console.log(`    Already had data-term: ${bookAlreadyAnnotated}`);
		console.log(`    Unmatched: ${bookUnmatched}`);
		console.log('');
	}

	console.log('=== Summary ===');
	console.log(`Files processed: ${totalFiles}`);
	console.log(`Total <dfn class="term"> elements: ${totalDfn}`);
	console.log(`Annotated with data-term: ${totalMatched}`);
	console.log(`Already annotated: ${totalAlreadyAnnotated}`);
	console.log(`Unmatched: ${totalUnmatched}`);

	if (totalDfn > 0) {
		const rate = (((totalMatched + totalAlreadyAnnotated) / totalDfn) * 100).toFixed(1);
		console.log(`Match rate: ${rate}%`);
	}

	if (allUnmatched.length > 0 && options.verbose) {
		const unique = [...new Set(allUnmatched)].sort();
		console.log(`\nUnmatched terms (${unique.length} unique):`);
		for (const term of unique) {
			console.log(`  - ${term}`);
		}
	}

	if (options.dryRun) {
		console.log('\n[DRY RUN] No files were modified. Run without --dry-run to apply changes.');
	}
}

main();
