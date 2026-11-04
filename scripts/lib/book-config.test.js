// @vitest-environment node
// esbuild refuses to start under jsdom, whose TextEncoder is not Node's.
import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { books } from '../../src/lib/types/book.ts';
import { LICENCES } from '../../src/lib/data/licences.ts';
import { creditLine } from '../../src/lib/data/bookCredits.ts';
import { loadBookConfig } from './book-config.js';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

// generate-pdfs.js reads book.ts through this esbuild bundle; the tests of
// pdf-attribution.js import the same modules directly. They must agree.
describe('loadBookConfig', () => {
	it('loads the books, licences and credit rule from src/lib', async () => {
		const config = await loadBookConfig(ROOT);
		expect(config.books.map((b) => [b.slug, b.title])).toEqual(
			books.map((b) => [b.slug, b.title])
		);
		expect(config.books.find((b) => b.slug === 'efnafraedi-2e').title).toBe('Efnafræði');
		expect(config.LICENCES).toEqual(LICENCES);
		for (const book of books) {
			const args = [book.slug, book.status, book.attribution.translators];
			expect(config.creditLine(...args)).toBe(creditLine(...args));
			expect(config.validateAttribution(book.attribution)).toEqual([]);
		}
	});
});
