// @vitest-environment node
// esbuild refuses to start under jsdom, whose TextEncoder is not Node's.
import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { books } from '../../src/lib/types/book.ts';
import { loadBookConfig } from './book-config.js';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

// generate-pdfs.js reads book.ts through this esbuild bundle; the tests of
// pdf-attribution.js import it directly. They must agree.
describe('loadBookConfig', () => {
	it('loads the books from src/lib/types/book.ts', async () => {
		const config = await loadBookConfig(ROOT);
		expect(config.books.map((b) => [b.slug, b.title])).toEqual(
			books.map((b) => [b.slug, b.title])
		);
		expect(config.books.find((b) => b.slug === 'efnafraedi-2e').title).toBe('Efnafræði');
	});
});
